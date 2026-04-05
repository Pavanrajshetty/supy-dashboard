import React, { useState } from "react";
import { KPI_MOCK, FUNNEL_KEYS, KPI_CARDS } from "../config/constants";
import { fmt, fmtUSD } from "../utils/formatters";
import KpiCard from "../components/KpiCard";
import SectionTitle from "../components/SectionTitle";
import AiBlock from "../components/AiBlock";
import FilterPill from "../components/FilterPill";
import { SQL_DATA } from "../data/sqlData";

export default function ExecutiveSummary() {
  const [timeRange, setTimeRange] = useState("30d");
  const kpi = KPI_MOCK[timeRange];
  const maxFunnel = kpi.spend;

  return (
    <div className="page">
      {/* Time filter */}
      <div className="filter-bar">
        {Object.keys(KPI_MOCK).map(r => (
          <FilterPill
            key={r}
            label={{ "1d":"Yesterday","7d":"Last 7d","30d":"Last 30d","60d":"Last 60d","90d":"Last 90d" }[r]}
            active={timeRange === r}
            onClick={() => setTimeRange(r)}
          />
        ))}
      </div>

      {/* KPI grid */}
      <div className="kpi-grid">
        {KPI_CARDS.map(c => (
          <KpiCard key={c.key} icon={c.icon} label={c.label} value={fmt(kpi[c.key], c.fmt)} />
        ))}
      </div>

      {/* Main split */}
      <div className="exec-split">
        {/* LEFT: Funnel */}
        <div className="card funnel-card">
          <SectionTitle>Conversion Funnel</SectionTitle>
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
                      <div
                        className="funnel-bar-fill"
                        style={{ width: `${i === 0 ? 100 : pct}%`, opacity: 1 - i * 0.08 }}
                      />
                    </div>
                  </div>
                  <div className="funnel-val">{fmt(val, step.fmt)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Top SQL table */}
        <div className="card sql-preview-card">
          <SectionTitle>Top SQLs</SectionTitle>
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
                {SQL_DATA.slice(0, 12).map(row => (
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

      {/* AI block */}
      <div className="ai-grid">
        <AiBlock color="green" title="✅ What Went Right" items={[
          "Algeria & Tunisia drove 40%+ of MQLs at under 20% of spend",
          "Philippines CPL dropped to AED 62 — lowest geo in portfolio",
          "SQL rate improved to 8.4% vs 5.1% prior period",
        ]} />
        <AiBlock color="red" title="❌ What Went Wrong" items={[
          "UK & AUS consuming 49% of budget at 3–5× average CPL",
          "March campaign edits triggered multiple learning phase resets",
          "Retargeting audience overlap inflating impression share",
        ]} />
        <AiBlock color="blue" title="⚡ Recommendations" items={[
          "Shift 20% UK/AUS budget → DZA / TUN / PHL immediately",
          "Freeze campaign structure for 7 days to stabilise learning",
          "Launch 3-way creative split test in top geos with DM + Lead Gen",
        ]} />
      </div>
    </div>
  );
}
