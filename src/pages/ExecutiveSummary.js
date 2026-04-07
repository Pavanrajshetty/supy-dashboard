import React, { useMemo, useState } from "react";
import {
  FUNNEL_KEYS,
  KPI_CARDS,
  TIME_LABELS,
  fmt,
} from "../data/executiveSummaryData";

import metaMasterData from "../data/processed/meta_master/meta_master.json";
import leadsMasterData from "../data/processed/leads_master/master.json";

// ── Constants ─────────────────────────────────────────────────
const RANGE_DAYS = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "60d": 60,
  "90d": 90,
};

// ── Helpers ───────────────────────────────────────────────────
function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getDateRange(timeRange) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  if (timeRange === "1d") {
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23, 59, 59, 999);

    return { start: yesterdayStart, end: yesterdayEnd };
  }

  const days = RANGE_DAYS[timeRange] ?? 30;
  const start = new Date(todayStart);
  start.setDate(start.getDate() - (days - 1));

  return { start, end: todayEnd };
}

function isWithinRange(dateValue, timeRange) {
  const d = parseDate(dateValue);
  if (!d) return false;

  const { start, end } = getDateRange(timeRange);
  return d >= start && d <= end;
}

function getFilteredMetaRows(rows, timeRange) {
  return rows.filter((row) => isWithinRange(row.date, timeRange));
}

function getFilteredSqlRows(rows, timeRange) {
  return rows.filter(
    (row) =>
      row?.sql === true &&
      isWithinRange(row?.hs_v2_date_entered_salesqualifiedlead, timeRange)
  );
}

function getFilteredClosedWonRows(rows, timeRange) {
  return rows.filter(
    (row) =>
      row?.closed_won === true &&
      isWithinRange(row?.hs_v2_date_entered_51997770, timeRange)
  );
}

function buildKpi(metaRows, sqlRows, closedWonRows) {
  const spend = metaRows.reduce((s, r) => s + safeNum(r.spend), 0);
  const impressions = metaRows.reduce((s, r) => s + safeNum(r.impressions), 0);
  const reach = metaRows.reduce((s, r) => s + safeNum(r.reach), 0);
  const clicks = metaRows.reduce((s, r) => s + safeNum(r.clicks), 0);
  const leads = metaRows.reduce((s, r) => s + safeNum(r.leads), 0);

  const sql = sqlRows.length;
  const pipeline = sqlRows.reduce((s, r) => s + safeNum(r.sql_amount_usd), 0);
  const closure = closedWonRows.reduce((s, r) => s + safeNum(r.deal_amount_usd), 0);

  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpl = leads > 0 ? spend / leads : 0;
  const costPerSql = sql > 0 ? spend / sql : 0;

  return {
    spend,
    impressions,
    cpm,
    reach,
    clicks,
    cpc,
    leads,
    cpl,
    sql,
    costPerSql,
    pipeline,
    closure,
  };
}

function getTopSqlRows(rows, limit = 15) {
  return [...rows]
    .sort((a, b) => safeNum(b.sql_amount_usd) - safeNum(a.sql_amount_usd))
    .slice(0, limit);
}

function getDisplayLink(row) {
  return row?.deal_link || row?.lead_link || "#";
}

function getDisplaySize(row) {
  const branches =
    row?.number_of_branches ??
    row?.number_of_locations ??
    null;

  if (!branches && branches !== 0) return "—";
  return `${branches} ${branches === 1 ? "branch" : "branches"}`;
}

// ── Component ─────────────────────────────────────────────────
export default function ExecutiveSummary() {
  const [timeRange, setTimeRange] = useState("30d");

  const metaRows = Array.isArray(metaMasterData) ? metaMasterData : [];
  const leadRows = Array.isArray(leadsMasterData) ? leadsMasterData : [];

  const filteredMetaRows = useMemo(
    () => getFilteredMetaRows(metaRows, timeRange),
    [metaRows, timeRange]
  );

  const filteredSqlRows = useMemo(
    () => getFilteredSqlRows(leadRows, timeRange),
    [leadRows, timeRange]
  );

  const filteredClosedWonRows = useMemo(
    () => getFilteredClosedWonRows(leadRows, timeRange),
    [leadRows, timeRange]
  );

  const kpi = useMemo(
    () => buildKpi(filteredMetaRows, filteredSqlRows, filteredClosedWonRows),
    [filteredMetaRows, filteredSqlRows, filteredClosedWonRows]
  );

  const topSqlRows = useMemo(
    () => getTopSqlRows(filteredSqlRows, 15),
    [filteredSqlRows]
  );

  const maxFunnel = kpi.spend || 1;

  return (
    <div className="page">
      {/* ── Time-range filter pills ── */}
      <div className="filter-bar">
        {Object.keys(RANGE_DAYS).map((r) => (
          <button
            key={r}
            className={`filter-pill${timeRange === r ? " active" : ""}`}
            onClick={() => setTimeRange(r)}
          >
            {TIME_LABELS[r]}
          </button>
        ))}
      </div>

      {/* ── KPI card grid ── */}
      <div className="kpi-grid">
        {KPI_CARDS.map((c) => (
          <div className="kpi-card" key={c.key}>
            <span className="kpi-icon">{c.icon}</span>
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-value">{fmt(kpi[c.key] ?? 0, c.fmt)}</div>
          </div>
        ))}
      </div>

      {/* ── Funnel + Top SQL split ── */}
      <div className="exec-split">
        <div className="card funnel-card">
          <h3 className="section-title">Conversion Funnel</h3>
          <div className="funnel-list">
            {FUNNEL_KEYS.map((step, i) => {
              const val = kpi[step.key] ?? 0;
              const pct =
                step.key === "spend"
                  ? 100
                  : Math.min(100, Math.round((val / maxFunnel) * 100));

              return (
                <div className="funnel-step" key={step.key}>
                  <div className="funnel-left">
                    <span className="funnel-icon">{step.icon}</span>
                    <span className="funnel-name">{step.label}</span>
                  </div>

                  <div className="funnel-bar-wrap">
                    <div className="funnel-bar-bg">
                      <div
                        className="funnel-bar-fill"
                        style={{
                          width: `${pct}%`,
                          opacity: 1 - i * 0.08,
                        }}
                      />
                    </div>
                  </div>

                  <div className="funnel-val">{fmt(val, step.fmt)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card sql-preview-card">
          <h3 className="section-title">Top SQLs</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Deal Value</th>
                  <th>Size</th>
                  <th>Geo</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {topSqlRows.length > 0 ? (
                  topSqlRows.map((row, idx) => (
                    <tr key={row.lead_id || row.deal_id || idx}>
                      <td>{row.company || "—"}</td>
                      <td className="num-cell">{fmt(safeNum(row.sql_amount_usd), "usd")}</td>
                      <td>
                        <span className="size-badge">{getDisplaySize(row)}</span>
                      </td>
                      <td>
                        <span className="geo-tag">{row.country || "—"}</span>
                      </td>
                      <td>
                        <a
                          className="hs-link"
                          href={getDisplayLink(row)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          ↗
                        </a>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "16px" }}>
                      No SQL data for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── AI insight blocks ── */}
      <div className="ai-grid">
        <div className="ai-block ai-green">
          <div className="ai-block-label">✅ What Went Right</div>
          <ul className="ai-block-list">
            <li>Algeria &amp; Tunisia drove 40%+ of MQLs at under 20% of spend</li>
            <li>Philippines CPL dropped to AED 62 — lowest geo in portfolio</li>
            <li>SQL rate improved to 8.4% vs 5.1% prior period</li>
          </ul>
        </div>

        <div className="ai-block ai-red">
          <div className="ai-block-label">❌ What Went Wrong</div>
          <ul className="ai-block-list">
            <li>UK &amp; AUS consuming 49% of budget at 3–5× average CPL</li>
            <li>March campaign edits triggered multiple learning phase resets</li>
            <li>Retargeting audience overlap inflating impression share</li>
          </ul>
        </div>

        <div className="ai-block ai-blue">
          <div className="ai-block-label">⚡ Recommendations</div>
          <ul className="ai-block-list">
            <li>Shift 20% UK/AUS budget → DZA / TUN / PHL immediately</li>
            <li>Freeze campaign structure for 7 days to stabilise learning</li>
            <li>Launch 3-way creative split test in top geos with DM + Lead Gen</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
