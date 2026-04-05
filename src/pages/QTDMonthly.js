import React, { useState, useMemo } from "react";

// ── Data ─────────────────────────────────────────────────────
const QUARTER_MONTHS = { Q1:["Jan","Feb","Mar"], Q2:["Apr","May","Jun"], Q3:["Jul","Aug","Sep"], Q4:["Oct","Nov","Dec"] };

const GEO_LIST = [
  { label:"UAE", flag:"🇦🇪" }, { label:"KSA", flag:"🇸🇦" }, { label:"UK",    flag:"🇬🇧" },
  { label:"AUS", flag:"🇦🇺" }, { label:"PHL", flag:"🇵🇭" }, { label:"DZA",   flag:"🇩🇿" },
  { label:"TUN", flag:"🇹🇳" }, { label:"Egypt",flag:"🇪🇬" },
];

const MTD_DATA = GEO_LIST.map((geo, i) => ({
  geo: geo.label, flag: geo.flag,
  spend:      { achieved:[16200,14500,6800,19800,7200,7800,12600,8100][i]  },
  mql:        { achieved:[72,68,28,81,34,29,54,33][i]                      },
  costPerMql: { achieved:[225,213,243,244,212,269,233,245][i]              },
  sql:        { achieved:[6,6,2,7,3,3,4,3][i]                             },
  costPerSql: { achieved:[2700,2417,3400,2829,2400,2600,3150,2700][i]     },
  pipeline:   { achieved:[84000,84000,28000,98000,42000,42000,56000,42000][i] },
}));

const SQL_DATA = [
  { quarter:"Q1", month:"Jan" }, { quarter:"Q1", month:"Jan" },
  { quarter:"Q1", month:"Feb" }, { quarter:"Q1", month:"Feb" },
  { quarter:"Q1", month:"Mar" }, { quarter:"Q1", month:"Mar" },
];

const KPI_MOCK = { spend:122840, impressions:4200000, cpm:29.2, reach:1100000, clicks:18430, cpc:6.67, leads:751, cpl:164, sql:63, costPerSql:1950, pipeline:882000, closure:176400 };
const KPI_CARDS = [
  { key:"spend",      label:"Spend",      fmt:"aed", icon:"💸" },
  { key:"impressions",label:"Impressions", fmt:"num", icon:"👁"  },
  { key:"cpm",        label:"CPM",         fmt:"aed", icon:"📡" },
  { key:"reach",      label:"Reach",       fmt:"num", icon:"📶" },
  { key:"clicks",     label:"Clicks",      fmt:"num", icon:"🖱" },
  { key:"cpc",        label:"CPC",         fmt:"aed", icon:"🎯" },
  { key:"leads",      label:"Leads",       fmt:"num", icon:"✅" },
  { key:"cpl",        label:"CPL",         fmt:"aed", icon:"💡" },
  { key:"sql",        label:"SQL",         fmt:"num", icon:"🏆" },
  { key:"costPerSql", label:"Cost / SQL",  fmt:"aed", icon:"🧮" },
  { key:"pipeline",   label:"Pipeline",    fmt:"usd", icon:"📊" },
  { key:"closure",    label:"Closure",     fmt:"usd", icon:"🔒" },
];

const fmtAED = v => `AED ${Number(v).toLocaleString("en", { maximumFractionDigits:0 })}`;
const fmtUSD = v => `$${Number(v).toLocaleString("en", { maximumFractionDigits:0 })}`;
const fmtNum = v => Number(v).toLocaleString("en", { maximumFractionDigits:0 });
function fmt(value, format) {
  if (format === "aed") return fmtAED(value);
  if (format === "usd") return fmtUSD(value);
  return fmtNum(value);
}

const AVAILABLE_QUARTERS = [...new Set(SQL_DATA.map(r => r.quarter))].sort();

// ── Page ─────────────────────────────────────────────────────
export default function QTDMonthly() {
  const [quarter, setQuarter] = useState(AVAILABLE_QUARTERS[0] || "Q1");
  const [month,   setMonth]   = useState(null);

  const monthsInQuarter = useMemo(() => {
    const qMonths = QUARTER_MONTHS[quarter] || [];
    return qMonths.filter(m => SQL_DATA.some(r => r.quarter === quarter && r.month === m));
  }, [quarter]);

  const handleQuarterClick = (q) => { setQuarter(q); setMonth(null); };

  const ctxLabel = month
    ? `${quarter} · ${month} 2026`
    : `${quarter} · All months (${monthsInQuarter.join(", ")}) 2026`;

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">QTD / Monthly View</h2>
      </div>

      <div className="filter-bar">
        {AVAILABLE_QUARTERS.map(q => (
          <button key={q} className={`filter-pill ${quarter === q ? "active" : ""}`} onClick={() => handleQuarterClick(q)}>{q}</button>
        ))}
        {monthsInQuarter.length > 0 && <div className="filter-sep" />}
        {monthsInQuarter.map(m => (
          <button key={m} className={`filter-pill ${month === m ? "active" : ""}`} onClick={() => setMonth(prev => prev === m ? null : m)}>{m}</button>
        ))}
      </div>

      <div className="ctx-label">Showing: {ctxLabel}</div>

      <div className="kpi-grid">
        {KPI_CARDS.map(c => (
          <div className="kpi-card" key={c.key}>
            <span className="kpi-icon">{c.icon}</span>
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-value">{fmt(KPI_MOCK[c.key], c.fmt)}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="section-title">Geo Breakdown — {month ? `${month} ${quarter}` : `All of ${quarter}`}</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Geo</th><th>Spend</th><th>MQL</th><th>CPL</th><th>SQL</th><th>CPSQL</th><th>Pipeline</th></tr>
            </thead>
            <tbody>
              {MTD_DATA.map(row => (
                <tr key={row.geo}>
                  <td><span className="geo-flag">{row.flag}</span> {row.geo}</td>
                  <td className="num-cell">{fmtAED(row.spend.achieved)}</td>
                  <td className="num-cell">{row.mql.achieved}</td>
                  <td className="num-cell">{fmtAED(row.costPerMql.achieved)}</td>
                  <td className="num-cell">{row.sql.achieved}</td>
                  <td className="num-cell">{fmtAED(row.costPerSql.achieved)}</td>
                  <td className="num-cell accent">{fmtUSD(row.pipeline.achieved)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
