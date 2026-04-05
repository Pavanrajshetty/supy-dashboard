import React, { useState } from "react";

// ── Data ─────────────────────────────────────────────────────
const KPI_MOCK = {
  "1d":  { spend:4820,   impressions:182000,   cpm:26.5, reach:94000,   clicks:740,   cpc:6.5,  leads:28,  cpl:172, sql:3,   costPerSql:1607, pipeline:42000,   closure:8400   },
  "7d":  { spend:31400,  impressions:1180000,  cpm:26.6, reach:610000,  clicks:5100,  cpc:6.2,  leads:198, cpl:159, sql:18,  costPerSql:1744, pipeline:252000,  closure:50400  },
  "30d": { spend:122840, impressions:4200000,  cpm:29.2, reach:1100000, clicks:18430, cpc:6.67, leads:751, cpl:164, sql:63,  costPerSql:1950, pipeline:882000,  closure:176400 },
  "60d": { spend:218000, impressions:7800000,  cpm:27.9, reach:2100000, clicks:34200, cpc:6.37, leads:1340,cpl:163, sql:112, costPerSql:1946, pipeline:1568000, closure:313600 },
  "90d": { spend:310000, impressions:11400000, cpm:27.2, reach:3200000, clicks:51000, cpc:6.08, leads:2010,cpl:154, sql:168, costPerSql:1845, pipeline:2352000, closure:470400 },
};

const FUNNEL_KEYS = [
  { key:"spend",       label:"Spend",      icon:"💸", fmt:"aed" },
  { key:"impressions", label:"Impressions", icon:"👁",  fmt:"num" },
  { key:"clicks",      label:"Clicks",      icon:"🖱",  fmt:"num" },
  { key:"leads",       label:"Leads (MQL)", icon:"✅", fmt:"num" },
  { key:"sql",         label:"SQL",         icon:"🏆", fmt:"num" },
  { key:"pipeline",    label:"Pipeline",    icon:"📈", fmt:"usd" },
  { key:"closure",     label:"Closure",     icon:"🔒", fmt:"usd" },
];

const KPI_CARDS = [
  { key:"spend",       label:"Spend",      fmt:"aed", icon:"💸" },
  { key:"impressions", label:"Impressions", fmt:"num", icon:"👁"  },
  { key:"cpm",         label:"CPM",         fmt:"aed", icon:"📡" },
  { key:"reach",       label:"Reach",       fmt:"num", icon:"📶" },
  { key:"clicks",      label:"Clicks",      fmt:"num", icon:"🖱" },
  { key:"cpc",         label:"CPC",         fmt:"aed", icon:"🎯" },
  { key:"leads",       label:"Leads",       fmt:"num", icon:"✅" },
  { key:"cpl",         label:"CPL",         fmt:"aed", icon:"💡" },
  { key:"sql",         label:"SQL",         fmt:"num", icon:"🏆" },
  { key:"costPerSql",  label:"Cost / SQL",  fmt:"aed", icon:"🧮" },
  { key:"pipeline",    label:"Pipeline",    fmt:"usd", icon:"📊" },
  { key:"closure",     label:"Closure",     fmt:"usd", icon:"🔒" },
];

const SQL_DATA = [
  { id:1,  company:"The Grill House Group",  country:"UAE",     geo:"GCC",      campaign:"GCC-TOFU-Meta",  sqlDate:"2026-03-28", createdDate:"2026-03-20", dealValue:28000, stage:"Proposal",    owner:"Sara K.",  quarter:"Q1", month:"Mar", hsUrl:"#" },
  { id:2,  company:"Nando's MENA",           country:"KSA",     geo:"GCC",      campaign:"GCC-BOFU-Meta",  sqlDate:"2026-03-25", createdDate:"2026-03-15", dealValue:15500, stage:"Negotiation", owner:"Ahmed R.",quarter:"Q1", month:"Mar", hsUrl:"#" },
  { id:3,  company:"Cravia Inc.",            country:"UAE",     geo:"GCC",      campaign:"GCC-TOFU-Meta",  sqlDate:"2026-03-22", createdDate:"2026-03-10", dealValue:22000, stage:"Closed Won",  owner:"Sara K.",  quarter:"Q1", month:"Mar", hsUrl:"#" },
  { id:4,  company:"The Chefs Table",        country:"UK",      geo:"Europe",   campaign:"EU-TOFU-Meta",   sqlDate:"2026-03-20", createdDate:"2026-03-08", dealValue:9200,  stage:"Discovery",   owner:"Liam T.", quarter:"Q1", month:"Mar", hsUrl:"#" },
  { id:5,  company:"Zahle Restaurant Group", country:"Algeria", geo:"N.Africa", campaign:"NA-TOFU-Meta",   sqlDate:"2026-03-18", createdDate:"2026-03-05", dealValue:18700, stage:"Proposal",    owner:"Maya L.", quarter:"Q1", month:"Mar", hsUrl:"#" },
  { id:6,  company:"Foodmark Philippines",   country:"PHL",     geo:"SEA",      campaign:"SEA-TOFU-Meta",  sqlDate:"2026-03-15", createdDate:"2026-03-01", dealValue:11400, stage:"Negotiation", owner:"Ana G.",  quarter:"Q1", month:"Mar", hsUrl:"#" },
  { id:7,  company:"Almaza Hospitality",     country:"Egypt",   geo:"N.Africa", campaign:"NA-BOFU-Meta",   sqlDate:"2026-03-12", createdDate:"2026-02-28", dealValue:31000, stage:"Closed Won",  owner:"Maya L.", quarter:"Q1", month:"Mar", hsUrl:"#" },
  { id:8,  company:"Max's Restaurant Chain", country:"PHL",     geo:"SEA",      campaign:"SEA-TOFU-Meta",  sqlDate:"2026-03-10", createdDate:"2026-02-25", dealValue:14200, stage:"Proposal",    owner:"Ana G.",  quarter:"Q1", month:"Mar", hsUrl:"#" },
  { id:9,  company:"Desert Rose Dining",     country:"UAE",     geo:"GCC",      campaign:"GCC-TOFU-Meta",  sqlDate:"2026-03-08", createdDate:"2026-02-20", dealValue:19500, stage:"Discovery",   owner:"Sara K.",  quarter:"Q1", month:"Feb", hsUrl:"#" },
  { id:10, company:"Fusion Kitchen AU",      country:"AUS",     geo:"APAC",     campaign:"APAC-TOFU-Meta", sqlDate:"2026-02-28", createdDate:"2026-02-15", dealValue:12800, stage:"Proposal",    owner:"Liam T.", quarter:"Q1", month:"Feb", hsUrl:"#" },
  { id:11, company:"Nile Group Holdings",    country:"Egypt",   geo:"N.Africa", campaign:"NA-TOFU-Meta",   sqlDate:"2026-02-20", createdDate:"2026-02-08", dealValue:23400, stage:"Negotiation", owner:"Maya L.", quarter:"Q1", month:"Feb", hsUrl:"#" },
  { id:12, company:"SkyLine Catering",       country:"KSA",     geo:"GCC",      campaign:"GCC-BOFU-Meta",  sqlDate:"2026-02-15", createdDate:"2026-02-01", dealValue:17600, stage:"Closed Won",  owner:"Ahmed R.",quarter:"Q1", month:"Feb", hsUrl:"#" },
];

// ── Formatters ────────────────────────────────────────────────
const fmtAED = v => `AED ${Number(v).toLocaleString("en", { maximumFractionDigits:0 })}`;
const fmtUSD = v => `$${Number(v).toLocaleString("en", { maximumFractionDigits:0 })}`;
const fmtNum = v => Number(v).toLocaleString("en", { maximumFractionDigits:0 });
function fmt(value, format) {
  if (format === "aed") return fmtAED(value);
  if (format === "usd") return fmtUSD(value);
  return fmtNum(value);
}

// ── Page ─────────────────────────────────────────────────────
export default function ExecutiveSummary() {
  const [timeRange, setTimeRange] = useState("30d");
  const kpi = KPI_MOCK[timeRange];
  const maxFunnel = kpi.spend;

  const TIME_LABELS = { "1d":"Yesterday","7d":"Last 7d","30d":"Last 30d","60d":"Last 60d","90d":"Last 90d" };

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
