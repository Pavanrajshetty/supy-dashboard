import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";

function getDateRange() {
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();

  const start = new Date(Date.UTC(year, month, 1));
  const yesterday = new Date(Date.UTC(year, month, today.getUTCDate() - 1));

  const startIso = start.toISOString().slice(0, 10);
  const endIso = `${yesterday.toISOString().slice(0, 10)}T23:59:59.999Z`;

  const fmt = (d) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });

  const label = `${fmt(start)} – ${fmt(yesterday)}, ${year}`;
  const planMonth = `${year}-${String(month + 1).padStart(2, "0")}`;
  const daysElapsed = today.getUTCDate() - 1;

  return { startIso, endIso, label, planMonth, daysElapsed };
}

function fmtUSD(value) {
  return `$${Math.round(Number(value || 0)).toLocaleString()}`;
}

function fmtNum(value) {
  return Number(value || 0).toLocaleString();
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeDivide(a, b) {
  if (!b) return 0;
  return a / b;
}

function pctDelta(expected, actual) {
  if (!expected) return 0;
  return Math.round(((actual - expected) / expected) * 100);
}

function varianceLabel(expected, actual) {
  const val = pctDelta(expected, actual);
  return `${val > 0 ? "+" : ""}${val}%`;
}

function getDeltaClass(value) {
  if (value > 0) return "delta-pos";
  if (value < 0) return "delta-neg";
  return "delta-neutral";
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateForDisplay(value) {
  const d = parseDate(value);
  if (!d) return "—";
  return d.toISOString().slice(0, 10);
}

function getSqlStage(row) {
  if (row?.deal_stage) return row.deal_stage;
  if (row?.is_closed_won === true) return "Closed Won";
  if (row?.is_sql === true) return "Sales Qualified";
  return "—";
}

function getCompany(row) {
  return row.company ?? row.deal_name ?? "—";
}

function getCountry(row) {
  return row.country ?? "Unknown";
}

function getGeo(row) {
  return row.country ?? "Unknown";
}

function getCampaign(row) {
  return (
    row.campaign_name ??
    row.utm_campaign ??
    row.hs_analytics_source_data_2 ??
    row.hs_analytics_source_data_1 ??
    "—"
  );
}

function getSqlDate(row) {
  return row.sql_date ?? null;
}

function getCreatedDate(row) {
  return row.lead_created_date ?? null;
}

function getHsUrl(row) {
  return row.deal_link || row.lead_link || "#";
}

function buildSqlRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row, index) => ({
    id: row.deal_id || row.lead_id || `sql-row-${index}`,
    company: getCompany(row),
    country: getCountry(row),
    geo: getGeo(row),
    campaign: getCampaign(row),
    sqlDate: formatDateForDisplay(getSqlDate(row)),
    sqlDateRaw: parseDate(getSqlDate(row)),
    createdDate: formatDateForDisplay(getCreatedDate(row)),
    createdDateRaw: parseDate(getCreatedDate(row)),
    dealValue: safeNum(row.amount_usd),
    stage: getSqlStage(row),
    hsUrl: getHsUrl(row),
  }));
}

function sortSqlRows(rows, sortKey, sortDir) {
  const arr = [...rows];

  arr.sort((a, b) => {
    let aVal = a[sortKey];
    let bVal = b[sortKey];

    if (sortKey === "sqlDate") {
      aVal = a.sqlDateRaw ? a.sqlDateRaw.getTime() : 0;
      bVal = b.sqlDateRaw ? b.sqlDateRaw.getTime() : 0;
    }

    if (sortKey === "createdDate") {
      aVal = a.createdDateRaw ? a.createdDateRaw.getTime() : 0;
      bVal = b.createdDateRaw ? b.createdDateRaw.getTime() : 0;
    }

    if (sortKey === "dealValue") {
      aVal = safeNum(a.dealValue);
      bVal = safeNum(b.dealValue);
    }

    if (typeof aVal === "string") aVal = aVal.toLowerCase();
    if (typeof bVal === "string") bVal = bVal.toLowerCase();

    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  return arr;
}

function normalizeInsights(aiInsights) {
  if (!aiInsights) return [];

  if (Array.isArray(aiInsights.cards) && aiInsights.cards.length > 0) {
    return aiInsights.cards.map((card, index) => ({
      title: card.title || `Insight ${index + 1}`,
      insight: card.insight || card.reason || "",
      action: card.action || "",
    }));
  }

  if (Array.isArray(aiInsights.priority_actions) && aiInsights.priority_actions.length > 0) {
    return aiInsights.priority_actions.map((item) => ({
      title: `Priority ${item.priority || ""} • ${item.action_type || "Action"}`,
      insight: item.why_this_matters || item.evidence || "",
      action: item.action || "",
      impact: item.expected_sql_impact || "",
      owner: item.owner || "",
      timeSensitivity: item.time_sensitivity || "",
    }));
  }

  return [];
}

export default function MTDDataRevamp() {
  const [rows, setRows] = useState([]);
  const [sqlDetailRows, setSqlDetailRows] = useState([]);
  const [aiInsights, setAiInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [sqlSortKey, setSqlSortKey] = useState("sqlDate");
  const [sqlSortDir, setSqlSortDir] = useState("desc");

  const dateRange = useMemo(() => getDateRange(), []);

  useEffect(() => {
    async function fetchMTD() {
      try {
        setLoading(true);
        setError(null);

        const { startIso, endIso, planMonth, daysElapsed } = dateRange;

        const [
          planMtdRes,
          actualSpendRes,
          actualMqlRes,
          actualSqlRes,
          planSqlRes,
          sqlDetailRes,
          insightRes,
        ] = await Promise.all([
          supabase
            .from("plan_daily")
            .select("geo, daily_spend_usd, daily_mql_target")
            .gte("plan_date", startIso)
            .lte("plan_date", endIso),

          supabase
            .from("meta_performance")
            .select("country_name, spend_usd, impressions, clicks, reach, leads")
            .gte("perf_date", startIso)
            .lte("perf_date", endIso),

          supabase
            .from("master_leads")
            .select("country")
            .gte("lead_created_date", startIso)
            .lte("lead_created_date", endIso),

          supabase
            .from("master_leads")
            .select("country, amount_usd")
            .eq("is_sql", true)
            .gte("sql_date", startIso)
            .lte("sql_date", endIso),

          supabase
            .from("plan_monthly")
            .select("geo, sql_target")
            .eq("plan_month", planMonth),

          supabase
            .from("master_leads")
            .select(`
              lead_id,
              deal_id,
              company,
              country,
              campaign_name,
              utm_campaign,
              hs_analytics_source_data_1,
              hs_analytics_source_data_2,
              lead_created_date,
              is_sql,
              sql_date,
              is_closed_won,
              close_date,
              amount_usd,
              deal_stage,
              deal_name,
              deal_link,
              lead_link
            `)
            .eq("is_sql", true)
            .gte("sql_date", startIso)
            .lte("sql_date", endIso)
            .order("sql_date", { ascending: false }),

          supabase
            .from("dashboard_ai_insights")
            .select("insights_json, report_date")
            .eq("page_key", "mtd_data")
            .order("report_date", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        for (const res of [
          planMtdRes,
          actualSpendRes,
          actualMqlRes,
          actualSqlRes,
          planSqlRes,
          sqlDetailRes,
        ]) {
          if (res.error) throw res.error;
        }

        const planMtdByGeo = {};
        for (const r of planMtdRes.data || []) {
          if (!planMtdByGeo[r.geo]) {
            planMtdByGeo[r.geo] = { expectedSpend: 0, expectedMql: 0 };
          }
          planMtdByGeo[r.geo].expectedSpend += Number(r.daily_spend_usd || 0);
          planMtdByGeo[r.geo].expectedMql += Number(r.daily_mql_target || 0);
        }

        const spendByGeo = {};
        for (const r of actualSpendRes.data || []) {
          const geo = r.country_name || "Unknown";
          spendByGeo[geo] = (spendByGeo[geo] || 0) + Number(r.spend_usd || 0);
        }

        const mqlByGeo = {};
        for (const r of actualMqlRes.data || []) {
          const geo = r.country || "Unknown";
          mqlByGeo[geo] = (mqlByGeo[geo] || 0) + 1;
        }

        const sqlByGeo = {};
        const pipelineByGeo = {};
        for (const r of actualSqlRes.data || []) {
          const geo = r.country || "Unknown";
          const value = Number(r.amount_usd || 0);

          sqlByGeo[geo] = (sqlByGeo[geo] || 0) + 1;
          pipelineByGeo[geo] = (pipelineByGeo[geo] || 0) + value;
        }

        const planSqlByGeo = {};
        for (const r of planSqlRes.data || []) {
          planSqlByGeo[r.geo] = Math.round((Number(r.sql_target || 0) / 30) * daysElapsed);
        }

        const allGeos = Array.from(
          new Set([
            ...Object.keys(planMtdByGeo),
            ...Object.keys(spendByGeo),
            ...Object.keys(mqlByGeo),
            ...Object.keys(sqlByGeo),
          ])
        );

        const merged = allGeos.map((geo) => {
          const expectedSpend = Math.round(planMtdByGeo[geo]?.expectedSpend || 0);
          const expectedMql = Math.round(planMtdByGeo[geo]?.expectedMql || 0);
          const actualSpend = Math.round(spendByGeo[geo] || 0);
          const actualMql = mqlByGeo[geo] || 0;
          const expectedSql = planSqlByGeo[geo] || 0;
          const actualSql = sqlByGeo[geo] || 0;
          const pipeline = pipelineByGeo[geo] || 0;

          return {
            geo,
            expectedSpend,
            actualSpend,
            expectedMql,
            actualMql,
            expectedSql,
            actualSql,
            pipeline,
          };
        });

        merged.sort((a, b) => b.actualSpend - a.actualSpend);

        if (!insightRes.error && insightRes.data?.insights_json) {
          setAiInsights(insightRes.data.insights_json);
        } else {
          setAiInsights(null);
        }

        setRows(merged);
        setSqlDetailRows(buildSqlRows(sqlDetailRes.data || []));
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

    const costPerMql =
      totals.actualMql > 0 ? safeDivide(totals.actualSpend, totals.actualMql) : null;
    const costPerSql =
      totals.actualSql > 0 ? safeDivide(totals.actualSpend, totals.actualSql) : null;

    const bestGeo =
      [...rows].sort(
        (a, b) => safeDivide(b.actualMql, b.actualSpend) - safeDivide(a.actualMql, a.actualSpend)
      )[0] || null;

    const riskGeo =
      [...rows].sort(
        (a, b) => pctDelta(a.expectedMql, a.actualMql) - pctDelta(b.expectedMql, b.actualMql)
      )[0] || null;

    return {
      totals,
      spendVar,
      mqlVar,
      sqlVar,
      costPerMql,
      costPerSql,
      bestGeo,
      riskGeo,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter(
      (r) => r.actualSql > 0 || r.expectedSpend >= 10
    );
  }, [rows]);

  const normalizedInsights = useMemo(() => normalizeInsights(aiInsights), [aiInsights]);

  const sortedSqlDetailRows = useMemo(() => {
    return sortSqlRows(sqlDetailRows, sqlSortKey, sqlSortDir);
  }, [sqlDetailRows, sqlSortKey, sqlSortDir]);

  const handleSqlSort = (key) => {
    if (sqlSortKey === key) {
      setSqlSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSqlSortKey(key);
      setSqlSortDir(
        key === "sqlDate" || key === "createdDate" || key === "dealValue" ? "desc" : "asc"
      );
    }
  };

  const SqlSortTh = ({ k, label, className = "" }) => (
    <th onClick={() => handleSqlSort(k)} className={`sortable-th ${className}`}>
      {label} {sqlSortKey === k ? (sqlSortDir === "asc" ? "▲" : "▼") : ""}
    </th>
  );

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
          grid-template-columns: repeat(6, minmax(180px, 1fr));
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
          min-width: 1100px;
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

        .live-insights {
          height: 900px;
          display: flex;
          flex-direction: column;
        }

        .insights-scroll {
          flex: 1;
          overflow-y: auto;
          padding-right: 6px;
        }

        .insight-card {
          border: 1px solid #eef2f7;
          border-radius: 14px;
          padding: 14px;
          background: #fbfcfe;
          margin-bottom: 12px;
        }

        .insight-card h4 {
          margin: 0 0 6px;
          font-size: 14px;
        }

        .insight-card p {
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
          color: #5b667a;
        }

        .insight-action {
          margin-top: 8px;
          font-size: 12px;
          color: #6b46c1;
          font-weight: 700;
          line-height: 1.4;
        }

        .insight-meta {
          margin-top: 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .insight-pill {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 999px;
          background: #f3f0ff;
          color: #6b46c1;
          font-size: 11px;
          font-weight: 700;
        }

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

        .sql-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid #d9dff0;
          background: #fff;
          color: #6b46c1;
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
        }

        .sql-link:hover { background: #f7f4ff; }

        .sql-stage {
          display: inline-flex;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          background: #f3f0ff;
          color: #6b46c1;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .sortable-th {
          cursor: pointer;
          user-select: none;
        }

        .sortable-th:hover { color: #374151; }

        @media (max-width: 1400px) {
          .kpi-grid {
            grid-template-columns: repeat(3, minmax(220px, 1fr));
          }
        }

        @media (max-width: 1200px) {
          .kpi-grid, .section-grid {
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
              <div className="kpi-label">Cost per MQL</div>
              <div className="kpi-value">
                {computed.costPerMql !== null ? fmtUSD(computed.costPerMql) : "—"}
              </div>
              <div className="kpi-sub">
                <span>Actual only</span>
                <span className="badge delta-neutral">Spend ÷ MQL</span>
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
              <div className="kpi-label">Cost per SQL</div>
              <div className="kpi-value">
                {computed.costPerSql !== null ? fmtUSD(computed.costPerSql) : "—"}
              </div>
              <div className="kpi-sub">
                <span>Actual only</span>
                <span className="badge delta-neutral">Spend ÷ SQL</span>
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
                      <th className="num">Cost / SQL</th>
                      <th className="num">SQL Var</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => {
                      const spendVar = pctDelta(row.expectedSpend, row.actualSpend);
                      const mqlVar = pctDelta(row.expectedMql, row.actualMql);
                      const sqlVar = pctDelta(row.expectedSql, row.actualSql);

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
                          <td className="num strong">
                            {row.actualSql > 0 ? fmtUSD(row.actualSpend / row.actualSql) : "—"}
                          </td>
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
                      <td className="num strong">
                        {computed.totals.actualSql > 0
                          ? fmtUSD(computed.totals.actualSpend / computed.totals.actualSql)
                          : "—"}
                      </td>
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

            <div className="card live-insights">
              <h3 className="section-title">Live Insights</h3>

              <div className="insights-scroll">
                {normalizedInsights.length > 0 ? (
                  normalizedInsights.map((card, i) => (
                    <div key={i} className="insight-card">
                      <h4>{card.title}</h4>

                      {card.insight && <p>{card.insight}</p>}

                      {card.action && (
                        <div className="insight-action">→ {card.action}</div>
                      )}

                      {(card.impact || card.owner || card.timeSensitivity) && (
                        <div className="insight-meta">
                          {card.impact && (
                            <span className="insight-pill">{card.impact}</span>
                          )}
                          {card.owner && (
                            <span className="insight-pill">{card.owner}</span>
                          )}
                          {card.timeSensitivity && (
                            <span className="insight-pill">{card.timeSensitivity}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <>
                    {computed.bestGeo && (
                      <div className="insight-card">
                        <h4>Best Efficiency Geo</h4>
                        <p>
                          <strong>{computed.bestGeo.geo}</strong> has the strongest MQL-per-spend
                          efficiency so far this month.
                        </p>
                      </div>
                    )}

                    {computed.riskGeo && (
                      <div className="insight-card">
                        <h4>Biggest Risk</h4>
                        <p>
                          <strong>{computed.riskGeo.geo}</strong> is the biggest under-delivery risk
                          vs MQL plan right now.
                        </p>
                      </div>
                    )}

                    <div className="insight-card">
                      <h4>Period</h4>
                      <p>
                        Showing {dateRange.daysElapsed} days of data ({dateRange.label}).
                        Updates automatically each day.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="section-title">MTD SQL Details ({sortedSqlDetailRows.length})</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <SqlSortTh k="company" label="Company" />
                    <SqlSortTh k="country" label="Country" />
                    <SqlSortTh k="geo" label="Geo" />
                    <SqlSortTh k="campaign" label="Campaign" />
                    <SqlSortTh k="sqlDate" label="SQL Date" />
                    <SqlSortTh k="createdDate" label="Created" />
                    <SqlSortTh k="dealValue" label="Deal Value" className="num" />
                    <SqlSortTh k="stage" label="Stage" />
                    <th>HubSpot</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSqlDetailRows.length > 0 ? (
                    sortedSqlDetailRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.company}</td>
                        <td>{row.country}</td>
                        <td>{row.geo}</td>
                        <td className="muted">{row.campaign}</td>
                        <td>{row.sqlDate}</td>
                        <td className="muted">{row.createdDate}</td>
                        <td className="num">{fmtUSD(row.dealValue)}</td>
                        <td>
                          <span className="sql-stage">{row.stage}</span>
                        </td>
                        <td>
                          <a
                            className="sql-link"
                            href={row.hsUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            ↗ View
                          </a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", color: "#738099" }}>
                        No MTD SQL rows found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
