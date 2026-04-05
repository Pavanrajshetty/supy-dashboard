import React, { useState } from "react";
import {
  KPI_MOCK, FUNNEL_KEYS, KPI_CARDS, TIME_LABELS, SQL_PREVIEW,
  fmt, fmtUSD,
} from "../data/executiveSummaryData";

export default function ExecutiveSummary() {
  const [timeRange, setTimeRange] = useState("30d");
  const kpi = KPI_MOCK[timeRange];
  const maxFunnel = kpi.spend;

  return (
    <div className="page">
      <div className="filter-bar">
        {Object.keys(KPI_MOCK).map(r => (
          <button key={r} className={`filter-pill ${timeRange === r ? "active" : ""}`} onClick={() => setTimeRange(r)}>
            {TIME_LABELS[r]}
          </button>
        ))}
      </div>

      <div className="kpi-grid">
        {KPI_CARDS.map(c => (
          <div className="kpi-card" key={c.key}>
            <span className="kpi-icon">{c.icon}</span>
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-value">{fmt(kpi[c.key], c.fmt)}</div>
          </div>
        ))}
      </div>

      <div className="exec-split">
        <div className="card funnel-card">
          <h3 className="section-title">Conversion Funnel</h3>
          <div className="funnel-list">
            {FUNNEL_KEYS.map((step, i) => {
              const val = kpi[step.key] || 0;
              const pct = Math.min(100, Math.round((val / maxFunnel) * 100));
              return (
                <div className="funnel-step" key={step.key}>
                  <div className="funnel-left">
                    <span className="funnel-icon">{step.icon}</span>
                    <span className="funnel-name">{step.label}</span>
                  </div>
                  <div className="funnel-bar-wrap">
                    <div className="funnel-bar-bg">
                      <div className="funnel-bar-fill" style={{ width:`${i===0?100:pct}%`, opacity:1-i*0.08 }} />
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
                <tr><th>Company</th><th>Deal Value</th><th>Size</th><th>Geo</th><th>Link</th></tr>
              </thead>
              <tbody>
                {SQL_PREVIEW.map(row => (
                  <tr key={row.id}>
                    <td>{row.company}</td>
                    <td className="num-cell">{fmtUSD(row.dealValue)}</td>
                    <td><span className="size-badge">Enterprise</span></td>
                    <td><span className="geo-tag">{row.country}</span></td>
                    <td><a className="hs-link" href={row.hsUrl} target="_blank" rel="noreferrer">↗</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="ai-grid">
        <div className="ai-block ai-green">
          <div className="ai-block-label">✅ What Went Right</div>
          <ul className="ai-block-list">
            <li>Algeria & Tunisia drove 40%+ of MQLs at under 20% of spend</li>
            <li>Philippines CPL dropped to AED 62 — lowest geo in portfolio</li>
            <li>SQL rate improved to 8.4% vs 5.1% prior period</li>
          </ul>
        </div>
        <div className="ai-block ai-red">
          <div className="ai-block-label">❌ What Went Wrong</div>
          <ul className="ai-block-list">
            <li>UK & AUS consuming 49% of budget at 3–5× average CPL</li>
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
