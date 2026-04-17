import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";

/* =========================
   AUTO DATE LOGIC
   - Current month: Apr 1 → yesterday
   - Past month: full month
========================= */

function getDateRange() {
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth(); // 0-indexed

  // Start = 1st of current month
  const start = new Date(Date.UTC(year, month, 1));

  // End = yesterday (today - 1 day), but cap at last day of month
  const yesterday = new Date(Date.UTC(year, month, today.getUTCDate() - 1));

  const startIso = start.toISOString().slice(0, 10); // "YYYY-MM-DD"
  // Use end-of-day timestamp so .lte catches all records on that day (including timestamps)
  const endIso = `${yesterday.toISOString().slice(0, 10)}T23:59:59.999Z`;

  // Label: "Apr 1 – Apr 16, 2026"
  const fmt = (d) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const label = `${fmt(start)} – ${fmt(yesterday)}, ${year}`;

  // plan_month for plan_monthly table: "YYYY-MM"
  const planMonth = `${year}-${String(month + 1).padStart(2, "0")}`;

  // Days elapsed (inclusive of yesterday, exclusive of today)
  const daysElapsed = today.getUTCDate() - 1;

  return { startIso, endIso, label, planMonth, daysElapsed };
}

/* =========================
   HELPERS
========================= */

function fmtAED(value) {
  return `AED ${Number(value || 0).toLocaleString()}`;
}

function fmtUSD(value) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function fmtNum(value) {
  return Number(value || 0).toLocaleString();
}

function pctDelta(expected, actual) {
  if (!expected) return 0;
  return Math.round(((actual - expected) / expected) * 100);
}

function varianceLabel(expected, actual) {
  const val = pctDelta(expected, actual);
  return `${val > 0 ? "+" : ""}${val}%`;
}

function getStatusClass(status) {
  const s = (status || "").toLowerCase();
  if (s === "scaling") return "pill scaling";
  if (s === "reduced") return "pill reduced";
  if (s === "paused") return "pill paused";
  return "pill stable";
}

function getDeltaClass(value) {
  if (value > 0) return "delta-pos";
  if (value < 0) return "delta-neg";
  return "delta-neutral";
}

function safeDivide(a, b) {
  if (!b) return 0;
  return a / b;
}

/* =========================
   COMPONENT
========================= */

export default function MTDDataRevamp() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const dateRange = useMemo(() => getDateRange(), []);

  useEffect(() => {
    async function fetchMTD() {
      try {
        setLoading(true);
        setError(null);

        const { startIso, endIso, planMonth, daysElapsed } = dateRange;

        // Run all 5 queries in parallel
        const [planMtdRes, actualSpendRes, actualMqlRes, actualSqlRes, planSqlRes] =
          await Promise.all([
            // 1. Plan MTD (daily spend + mql targets)
            supabase
              .from("plan_daily")
              .select("geo, daily_spend_usd, daily_mql_target")
              .gte("plan_date", startIso)
              .lte("plan_date", endIso),

            // 2. Actual spend from meta_performance
            supabase
              .from("meta_performance")
              .select("country_name, spend_usd")
              .gte("perf_date", startIso)
              .lte("perf_date", endIso),

            // 3. Actual MQL from master_leads
            supabase
              .from("master_leads")
              .select("country")
              .gte("lead_created_date", startIso)
              .lte("lead_created_date", endIso),

            // 4. Actual SQL from master_leads
            supabase
              .from("master_leads")
              .select("country")
              .eq("is_sql", true)
              .gte("sql_date", startIso)
              .lte("sql_date", endIso),

            // 5. Monthly SQL target from plan_monthly
            supabase
              .from("plan_monthly")
              .select("geo, sql_target")
              .eq("plan_month", planMonth),
          ]);

        // Check errors
        for (const res of [planMtdRes, actualSpendRes, actualMqlRes, actualSqlRes, planSqlRes]) {
          if (res.error) throw res.error;
        }

        // Aggregate plan_mtd by geo
        const planMtdByGeo = {};
        for (const r of planMtdRes.data || []) {
          if (!planMtdByGeo[r.geo]) planMtdByGeo[r.geo] = { expectedSpend: 0, expectedMql: 0 };
          planMtdByGeo[r.geo].expectedSpend += Number(r.daily_spend_usd || 0);
          planMtdByGeo[r.geo].expectedMql += Number(r.daily_mql_target || 0);
        }

        // Aggregate actual spend by geo (country_name)
        const spendByGeo = {};
        for (const r of actualSpendRes.data || []) {
          spendByGeo[r.country_name] = (spendByGeo[r.country_name] || 0) + Number(r.spend_usd || 0);
        }

        // Aggregate actual MQL by geo
        const mqlByGeo = {};
        for (const r of actualMqlRes.data || []) {
          mqlByGeo[r.country] = (mqlByGeo[r.country] || 0) + 1;
        }

        // Aggregate actual SQL by geo
        const sqlByGeo = {};
        for (const r of actualSqlRes.data || []) {
          sqlByGeo[r.country] = (sqlByGeo[r.country] || 0) + 1;
        }

        // Build plan SQL by geo (prorated: sql_target / 30 * daysElapsed)
        const planSqlByGeo = {};
        for (const r of planSqlRes.data || []) {
          planSqlByGeo[r.geo] = Math.round((Number(r.sql_target || 0) / 30) * daysElapsed);
        }

        // Merge all into GEO_DATA — plan_mtd geos drive the rows
        const merged = Object.keys(planMtdByGeo).map((geo) => {
          const expectedSpend = Math.round(planMtdByGeo[geo].expectedSpend);
          const expectedMql = Math.round(planMtdByGeo[geo].expectedMql);
          const actualSpend = Math.round(spendByGeo[geo] || 0);
          const actualMql = mqlByGeo[geo] || 0;
          const actualSql = sqlByGeo[geo] || 0;
          const expectedSql = planSqlByGeo[geo] || 0;
          const pipeline = 0; // pipeline comes from deals; not in scope here unless you want it

          return {
            geo,
            flag: "", // no flag mapping needed unless you add a lookup
            expectedSpend,
            actualSpend,
            expectedMql,
            actualMql,
            expectedSql,
            actualSql,
            pipeline,
          };
        });

        // Sort by actual spend desc
        merged.sort((a, b) => b.actualSpend - a.actualSpend);

        setRows(merged);
      } catch (err) {
        console.error("MTD fetch error:", err);
        setError(err.message || "Failed to load MTD data");
      } finally {
        setLoading(false);
      }
    }

    fetchMTD();
  }, [dateRange]);

  const computed = useMemo(() => {
    const totals = rows.reduce(
      (acc, row) => {
        acc.expectedSpend += row.expectedSpend;
        acc.actualSpend += row.actualSpend;
        acc.expectedMql += row.expectedMql;
        acc.actualMql += row.actualMql;
        acc.expectedSql += row.expectedSql;
        acc.actualSql += row.actualSql;
        acc.pipeline += row.pipeline;
        return acc;
      },
      {
        expectedSpend: 0,
        actualSpend: 0,
        expectedMql: 0,
        actualMql: 0,
        expectedSql: 0,
        actualSql: 0,
        pipeline: 0,
      }
    );

    const spendVar = pctDelta(totals.expectedSpend, totals.actualSpend);
    const mqlVar = pctDelta(totals.expectedMql, totals.actualMql);
    const sqlVar = pctDelta(totals.expectedSql, totals.actualSql);

    const bestGeo = [...rows].sort(
      (a, b) =>
        safeDivide(b.actualMql, b.actualSpend) - safeDivide(a.actualMql, a.actualSpend)
    )[0] || null;

    const riskGeo = [...rows].sort(
      (a, b) => pctDelta(a.expectedMql, a.actualMql) - pctDelta(b.expectedMql, b.actualMql)
    )[0] || null;

    return { totals, spendVar, mqlVar, sqlVar, bestGeo, riskGeo };
  }, [rows]);

  return (
    <div className="mtd-page">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Inter, Arial, sans-serif; }

        .mtd-page {
          padding: 24px;
          background: #f6f8fb;
          min-height: 100vh;
          color: #172033;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 20px;
        }

        .header-left h1 {
          margin: 0 0 6px;
          font-size: 28px;
          line-height: 1.2;
        }

        .header-left p {
          margin: 0;
          color: #5b667a;
          font-size: 14px;
        }

        .header-right {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .tag {
          padding: 8px 12px;
          border-radius: 999px;
          background: white;
          border: 1px solid #e3e8f2;
          font-size: 12px;
          color: #44506a;
          font-weight: 600;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        .card {
          background: white;
          border: 1px solid #e7ebf3;
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 4px 14px rgba(18, 38, 63, 0.04);
        }

        .kpi-label {
          font-size: 13px;
          color: #69758c;
          margin-bottom: 8px;
          font-weight: 600;
        }

        .kpi-value {
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .kpi-sub {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          font-size: 13px;
          color: #536079;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }

        .delta-pos { color: #0f8a43; background: #e9f8ef; }
        .delta-neg { color: #c23535; background: #fdecec; }
        .delta-neutral { color: #6b7280; background: #f3f4f6; }

        .section-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }

        .section-title {
          margin: 0 0 14px;
          font-size: 18px;
          font-weight: 800;
        }

        .table-wrap { overflow-x: auto; }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 980px;
        }

        th {
          text-align: left;
          font-size: 12px;
          color: #6b7280;
          font-weight: 700;
          padding: 12px 10px;
          border-bottom: 1px solid #edf1f7;
          white-space: nowrap;
          background: #fafbfd;
        }

        td {
          padding: 14px 10px;
          border-bottom: 1px solid #f1f4f9;
          font-size: 14px;
          vertical-align: middle;
        }

        tr:hover td { background: #fafcff; }

        .geo-cell { font-weight: 700; white-space: nowrap; }
        .num { text-align: right; font-variant-numeric: tabular-nums; }
        .muted { color: #738099; }
        .strong { font-weight: 800; }

        .pill {
          display: inline-flex;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }

        .pill.scaling { background: #e9f8ef; color: #0f8a43; }
        .pill.reduced { background: #fff4e5; color: #b96b00; }
        .pill.paused  { background: #fdecec; color: #c23535; }
        .pill.stable  { background: #edf3ff; color: #2457c5; }

        .side-list { display: flex; flex-direction: column; gap: 12px; }

        .insight-item {
          border: 1px solid #eef2f7;
          border-radius: 14px;
          padding: 14px;
          background: #fbfcfe;
        }

        .insight-item h4 { margin: 0 0 6px; font-size: 14px; }
        .insight-item p  { margin: 0; font-size: 13px; line-height: 1.5; color: #5b667a; }

        .changes-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .mini-card-title { margin: 0 0 12px; font-size: 15px; font-weight: 800; }
        .mini-list { display: flex; flex-direction: column; gap: 10px; }

        .mini-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid #f0f3f8;
          font-size: 14px;
        }

        .mini-row:last-child { border-bottom: 0; }
        .reason { color: #6a768d; font-size: 12px; margin-top: 4px; }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: #69758c;
          font-size: 15px;
        }

        .error-state {
          padding: 16px;
          background: #fdecec;
          color: #c23535;
          border-radius: 12px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        @media (max-width: 1200px) {
          .kpi-grid, .changes-grid, .section-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="header">
        <div className="header-left">
          <h1>MTD Performance Dashboard</h1>
          <p>{dateRange.label} — Plan vs Actual</p>
        </div>
        <div className="header-right">
          <div className="tag">Period: {dateRange.label}</div>
          <div className="tag">Days Elapsed: {dateRange.daysElapsed}</div>
        </div>
      </div>

      {error && <div className="error-state">⚠️ {error}</div>}

      {loading ? (
        <div className="loading-state">Loading MTD data...</div>
      ) : (
        <>
          {/* KPI CARDS */}
          <div className="kpi-grid">
            <div className="card">
              <div className="kpi-label">Spend (USD)</div>
              <div className="kpi-value">{fmtUSD(computed.totals.actualSpend)}</div>
              <div className="kpi-sub">
                <span>Expected: {fmtUSD(computed.totals.expectedSpend)}</span>
                <span className={`badge ${getDeltaClass(computed.spendVar)}`}>
                  {varianceLabel(computed.totals.expectedSpend, computed.totals.actualSpend)} vs Plan
                </span>
              </div>
            </div>

            <div className="card">
              <div className="kpi-label">MQL</div>
              <div className="kpi-value">{fmtNum(computed.totals.actualMql)}</div>
              <div className="kpi-sub">
                <span>Expected: {fmtNum(computed.totals.expectedMql)}</span>
                <span className={`badge ${getDeltaClass(computed.mqlVar)}`}>
                  {varianceLabel(computed.totals.expectedMql, computed.totals.actualMql)} vs Plan
                </span>
              </div>
            </div>

            <div className="card">
              <div className="kpi-label">SQL</div>
              <div className="kpi-value">{fmtNum(computed.totals.actualSql)}</div>
              <div className="kpi-sub">
                <span>Expected: {fmtNum(computed.totals.expectedSql)}</span>
                <span className={`badge ${getDeltaClass(computed.sqlVar)}`}>
                  {varianceLabel(computed.totals.expectedSql, computed.totals.actualSql)} vs Plan
                </span>
              </div>
            </div>

            <div className="card">
              <div className="kpi-label">Pipeline</div>
              <div className="kpi-value">{fmtUSD(computed.totals.pipeline)}</div>
              <div className="kpi-sub">
                <span>Actual only</span>
                <span className="badge delta-neutral">Live decision view</span>
              </div>
            </div>
          </div>

          {/* MAIN TABLE + INSIGHTS */}
          <div className="section-grid">
            <div className="card">
              <h3 className="section-title">Geo Performance Overview</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Geo</th>
                      <th className="num">Expected Spend</th>
                      <th className="num">Actual Spend</th>
                      <th className="num">Spend Var</th>
                      <th className="num">Expected MQL</th>
                      <th className="num">Actual MQL</th>
                      <th className="num">MQL Var</th>
                      <th className="num">Expected SQL</th>
                      <th className="num">Actual SQL</th>
                      <th className="num">SQL Var</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const spendVar = pctDelta(row.expectedSpend, row.actualSpend);
                      const mqlVar   = pctDelta(row.expectedMql, row.actualMql);
                      const sqlVar   = pctDelta(row.expectedSql, row.actualSql);
                      return (
                        <tr key={row.geo}>
                          <td className="geo-cell">{row.geo}</td>
                          <td className="num muted">{fmtUSD(row.expectedSpend)}</td>
                          <td className="num">{fmtUSD(row.actualSpend)}</td>
                          <td className="num">
                            <span className={`badge ${getDeltaClass(spendVar)}`}>
                              {varianceLabel(row.expectedSpend, row.actualSpend)}
                            </span>
                          </td>
                          <td className="num muted">{fmtNum(row.expectedMql)}</td>
                          <td className="num">{fmtNum(row.actualMql)}</td>
                          <td className="num">
                            <span className={`badge ${getDeltaClass(mqlVar)}`}>
                              {varianceLabel(row.expectedMql, row.actualMql)}
                            </span>
                          </td>
                          <td className="num muted">{fmtNum(row.expectedSql)}</td>
                          <td className="num">{fmtNum(row.actualSql)}</td>
                          <td className="num">
                            <span className={`badge ${getDeltaClass(sqlVar)}`}>
                              {varianceLabel(row.expectedSql, row.actualSql)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="geo-cell strong">Total</td>
                      <td className="num muted strong">{fmtUSD(computed.totals.expectedSpend)}</td>
                      <td className="num strong">{fmtUSD(computed.totals.actualSpend)}</td>
                      <td className="num">
                        <span className={`badge ${getDeltaClass(computed.spendVar)}`}>
                          {varianceLabel(computed.totals.expectedSpend, computed.totals.actualSpend)}
                        </span>
                      </td>
                      <td className="num muted strong">{fmtNum(computed.totals.expectedMql)}</td>
                      <td className="num strong">{fmtNum(computed.totals.actualMql)}</td>
                      <td className="num">
                        <span className={`badge ${getDeltaClass(computed.mqlVar)}`}>
                          {varianceLabel(computed.totals.expectedMql, computed.totals.actualMql)}
                        </span>
                      </td>
                      <td className="num muted strong">{fmtNum(computed.totals.expectedSql)}</td>
                      <td className="num strong">{fmtNum(computed.totals.actualSql)}</td>
                      <td className="num">
                        <span className={`badge ${getDeltaClass(computed.sqlVar)}`}>
                          {varianceLabel(computed.totals.expectedSql, computed.totals.actualSql)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="card">
              <h3 className="section-title">Live Insights</h3>
              <div className="side-list">
                {computed.bestGeo && (
                  <div className="insight-item">
                    <h4>Best Efficiency Geo</h4>
                    <p>
                      <strong>{computed.bestGeo.geo}</strong> has the strongest MQL-per-spend
                      efficiency so far this month.
                    </p>
                  </div>
                )}
                {computed.riskGeo && (
                  <div className="insight-item">
                    <h4>Biggest Risk</h4>
                    <p>
                      <strong>{computed.riskGeo.geo}</strong> is the biggest under-delivery risk
                      vs MQL plan right now.
                    </p>
                  </div>
                )}
                <div className="insight-item">
                  <h4>Period</h4>
                  <p>
                    Showing {dateRange.daysElapsed} days of data ({dateRange.label}).
                    Updates automatically each day.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
