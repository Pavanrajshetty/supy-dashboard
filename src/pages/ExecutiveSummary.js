import React, { useMemo, useState } from "react";
import {
  FUNNEL_KEYS,
  KPI_CARDS,
  TIME_LABELS,
  SQL_PREVIEW,
  fmt,
  fmtUSD,
} from "../data/executiveSummaryData";

import adsetData from "../../data/processed/meta/adset_master.json";

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

function getFilteredRows(rows, timeRange) {
  const days = RANGE_DAYS[timeRange] ?? 30;
  const now = new Date();
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(now.getDate() - (days - 1));
  return rows.filter((row) => {
    if (!row.date) return false;
    const d = new Date(row.date);
    return d >= cutoff && d <= now;
  });
}

function buildKpi(rows) {
  const spend       = rows.reduce((s, r) => s + safeNum(r.spend),       0);
  const impressions = rows.reduce((s, r) => s + safeNum(r.impressions), 0);
  const reach       = rows.reduce((s, r) => s + safeNum(r.reach),       0);
  const clicks      = rows.reduce((s, r) => s + safeNum(r.clicks),      0);
  const leads       = rows.reduce((s, r) => s + safeNum(r.leads),       0);

  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const cpc = clicks      > 0 ? spend / clicks              : 0;
  const cpl = leads       > 0 ? spend / leads               : 0;

  return {
    spend,
    impressions,
    cpm,
    reach,
    clicks,
    cpc,
    leads,
    cpl,
    sql:        0,
    costPerSql: 0,
    pipeline:   0,
    closure:    0,
  };
}

// ── Component ─────────────────────────────────────────────────
export default function ExecutiveSummary() {
  const [timeRange, setTimeRange] = useState("30d");

  const metaRows = Array.isArray(adsetData) ? adsetData : [];

  const filteredRows = useMemo(
    () => getFilteredRows(metaRows, timeRange),
    [metaRows, timeRange]
  );

  const kpi = useMemo(() => buildKpi(filteredRows), [filteredRows]);

  // Funnel bar widths are relative to spend (first / largest step)
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
              const pct = Math.min(100, Math.round((val / maxFunnel) * 100));
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
                          width: `${i === 0 ? 100 : pct}%`,
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
                {SQL_PREVIEW.map((row) => (
                  <tr key={row.id}>
                    <td>{row.company}</td>
                    <td className="num-cell">{fmtUSD(row.dealValue)}</td>
                    <td><span className="size-badge">Enterprise</span></td>
                    <td><span className="geo-tag">{row.country}</span></td>
                    <td>
                      <a
                        className="hs-link"
                        href={row.hsUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        ↗
                      </a>
                    </td>
                  </tr>
                ))}
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
