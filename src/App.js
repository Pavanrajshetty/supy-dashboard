import React, { useState, useMemo } from "react";
import "./styles.css";

// ============================================================
// MOCK DATA
// ============================================================

const GEO_LIST = [
  { code: "AE", label: "UAE", flag: "🇦🇪", region: "GCC" },
  { code: "SA", label: "KSA", flag: "🇸🇦", region: "GCC" },
  { code: "GB", label: "UK", flag: "🇬🇧", region: "Europe" },
  { code: "AU", label: "AUS", flag: "🇦🇺", region: "APAC" },
  { code: "PH", label: "PHL", flag: "🇵🇭", region: "SEA" },
  { code: "DZ", label: "DZA", flag: "🇩🇿", region: "N.Africa" },
  { code: "TN", label: "TUN", flag: "🇹🇳", region: "N.Africa" },
  { code: "EG", label: "Egypt", flag: "🇪🇬", region: "N.Africa" },
  { code: "SG", label: "SGP", flag: "🇸🇬", region: "SEA" },
  { code: "ZA", label: "ZAF", flag: "🇿🇦", region: "Africa" },
];

const KPI_MOCK = {
  "1d":  { spend:4820,  impressions:182000, cpm:26.5, reach:94000,  clicks:740,  cpc:6.5,  leads:28,  cpl:172, sql:3,  costPerSql:1607, pipeline:42000,  closure:8400  },
  "7d":  { spend:31400, impressions:1180000,cpm:26.6, reach:610000, clicks:5100, cpc:6.2,  leads:198, cpl:159, sql:18, costPerSql:1744, pipeline:252000, closure:50400 },
  "30d": { spend:122840,impressions:4200000,cpm:29.2, reach:1100000,clicks:18430,cpc:6.67, leads:751, cpl:164, sql:63, costPerSql:1950, pipeline:882000, closure:176400},
  "60d": { spend:218000,impressions:7800000,cpm:27.9, reach:2100000,clicks:34200,cpc:6.37, leads:1340,cpl:163, sql:112,costPerSql:1946, pipeline:1568000,closure:313600},
  "90d": { spend:310000,impressions:11400000,cpm:27.2,reach:3200000,clicks:51000,cpc:6.08, leads:2010,cpl:154, sql:168,costPerSql:1845, pipeline:2352000,closure:470400},
};

const FUNNEL_KEYS = [
  { key:"spend",       label:"Spend",       icon:"💸", fmt:"aed" },
  { key:"impressions", label:"Impressions",  icon:"👁",  fmt:"num" },
  { key:"clicks",      label:"Clicks",       icon:"🖱",  fmt:"num" },
  { key:"leads",       label:"Leads (MQL)",  icon:"✅", fmt:"num" },
  { key:"sql",         label:"SQL",          icon:"🏆", fmt:"num" },
  { key:"pipeline",    label:"Pipeline",     icon:"📈", fmt:"usd" },
  { key:"closure",     label:"Closure",      icon:"🔒", fmt:"usd" },
];

const KPI_CARDS = [
  { key:"spend",       label:"Spend",        fmt:"aed", icon:"💸" },
  { key:"impressions", label:"Impressions",   fmt:"num", icon:"👁"  },
  { key:"cpm",         label:"CPM",           fmt:"aed", icon:"📡" },
  { key:"reach",       label:"Reach",         fmt:"num", icon:"📶" },
  { key:"clicks",      label:"Clicks",        fmt:"num", icon:"🖱" },
  { key:"cpc",         label:"CPC",           fmt:"aed", icon:"🎯" },
  { key:"leads",       label:"Leads",         fmt:"num", icon:"✅" },
  { key:"cpl",         label:"CPL",           fmt:"aed", icon:"💡" },
  { key:"sql",         label:"SQL",           fmt:"num", icon:"🏆" },
  { key:"costPerSql",  label:"Cost / SQL",    fmt:"aed", icon:"🧮" },
  { key:"pipeline",    label:"Pipeline",      fmt:"usd", icon:"📊" },
  { key:"closure",     label:"Closure",       fmt:"usd", icon:"🔒" },
];

const SQL_DATA = [
  { id:1,  company:"The Grill House Group",   country:"UAE",      geo:"GCC",     campaign:"GCC-TOFU-Meta",  sqlDate:"2026-03-28", createdDate:"2026-03-20", dealValue:28000, stage:"Proposal",   owner:"Sara K.",   quarter:"Q1", month:"Mar" },
  { id:2,  company:"Nando's MENA",             country:"KSA",      geo:"GCC",     campaign:"GCC-BOFU-Meta",  sqlDate:"2026-03-25", createdDate:"2026-03-15", dealValue:15500, stage:"Negotiation",owner:"Ahmed R.",  quarter:"Q1", month:"Mar" },
  { id:3,  company:"Cravia Inc.",              country:"UAE",      geo:"GCC",     campaign:"GCC-TOFU-Meta",  sqlDate:"2026-03-22", createdDate:"2026-03-10", dealValue:22000, stage:"Closed Won", owner:"Sara K.",   quarter:"Q1", month:"Mar" },
  { id:4,  company:"The Chefs Table",          country:"UK",       geo:"Europe",  campaign:"EU-TOFU-Meta",   sqlDate:"2026-03-20", createdDate:"2026-03-08", dealValue:9200,  stage:"Discovery", owner:"Liam T.",   quarter:"Q1", month:"Mar" },
  { id:5,  company:"Zahle Restaurant Group",   country:"Algeria",  geo:"N.Africa",campaign:"NA-TOFU-Meta",   sqlDate:"2026-03-18", createdDate:"2026-03-05", dealValue:18700, stage:"Proposal",   owner:"Maya L.",   quarter:"Q1", month:"Mar" },
  { id:6,  company:"Foodmark Philippines",     country:"PHL",      geo:"SEA",     campaign:"SEA-TOFU-Meta",  sqlDate:"2026-03-15", createdDate:"2026-03-01", dealValue:11400, stage:"Negotiation",owner:"Ana G.",    quarter:"Q1", month:"Mar" },
  { id:7,  company:"Almaza Hospitality",       country:"Egypt",    geo:"N.Africa",campaign:"NA-BOFU-Meta",   sqlDate:"2026-03-12", createdDate:"2026-02-28", dealValue:31000, stage:"Closed Won", owner:"Maya L.",   quarter:"Q1", month:"Mar" },
  { id:8,  company:"Max's Restaurant Chain",   country:"PHL",      geo:"SEA",     campaign:"SEA-TOFU-Meta",  sqlDate:"2026-03-10", createdDate:"2026-02-25", dealValue:14200, stage:"Proposal",   owner:"Ana G.",    quarter:"Q1", month:"Mar" },
  { id:9,  company:"Desert Rose Dining",       country:"UAE",      geo:"GCC",     campaign:"GCC-TOFU-Meta",  sqlDate:"2026-03-08", createdDate:"2026-02-20", dealValue:19500, stage:"Discovery", owner:"Sara K.",   quarter:"Q1", month:"Feb" },
  { id:10, company:"Fusion Kitchen AU",        country:"AUS",      geo:"APAC",    campaign:"APAC-TOFU-Meta", sqlDate:"2026-02-28", createdDate:"2026-02-15", dealValue:12800, stage:"Proposal",   owner:"Liam T.",   quarter:"Q1", month:"Feb" },
  { id:11, company:"Nile Group Holdings",      country:"Egypt",    geo:"N.Africa",campaign:"NA-TOFU-Meta",   sqlDate:"2026-02-20", createdDate:"2026-02-08", dealValue:23400, stage:"Negotiation",owner:"Maya L.",   quarter:"Q1", month:"Feb" },
  { id:12, company:"SkyLine Catering",         country:"KSA",      geo:"GCC",     campaign:"GCC-BOFU-Meta",  sqlDate:"2026-02-15", createdDate:"2026-02-01", dealValue:17600, stage:"Closed Won", owner:"Ahmed R.",  quarter:"Q1", month:"Feb" },
  { id:13, company:"Hanoi Street Kitchen",     country:"SGP",      geo:"SEA",     campaign:"SEA-TOFU-Meta",  sqlDate:"2026-01-28", createdDate:"2026-01-18", dealValue:8900,  stage:"Discovery", owner:"Ana G.",    quarter:"Q1", month:"Jan" },
  { id:14, company:"Cape Town Eats",           country:"ZAF",      geo:"Africa",  campaign:"AF-TOFU-Meta",   sqlDate:"2026-01-20", createdDate:"2026-01-10", dealValue:10200, stage:"Proposal",   owner:"Sara K.",   quarter:"Q1", month:"Jan" },
  { id:15, company:"Saveur Bistro Group",      country:"Tunisia",  geo:"N.Africa",campaign:"NA-TOFU-Meta",   sqlDate:"2026-01-15", createdDate:"2026-01-05", dealValue:16700, stage:"Negotiation",owner:"Maya L.",   quarter:"Q1", month:"Jan" },
];

const MTD_DATA = GEO_LIST.slice(0, 8).map((geo, i) => ({
  geo: geo.label,
  flag: geo.flag,
  spend:       { expected: [18000,12000,8000,22000,6000,5000,14000,9000][i],  achieved: [16200,14500,6800,19800,7200,7800,12600,8100][i]  },
  mql:         { expected: [80,55,35,90,28,22,60,38][i],                      achieved: [72,68,28,81,34,29,54,33][i]                      },
  costPerMql:  { expected: [225,218,229,244,214,227,233,237][i],              achieved: [225,213,243,244,212,269,233,245][i]              },
  sqlPct:      { expected: [9,8,7,10,8,9,8,7][i],                            achieved: [8.3,9.1,7.1,8.6,9.4,10.3,7.8,7.6][i]           },
  sql:         { expected: [7,4,2,9,2,2,5,3][i],                             achieved: [6,6,2,7,3,3,4,3][i]                             },
  costPerSql:  { expected: [2571,3000,4000,2444,3000,2500,2800,3000][i],     achieved: [2700,2417,3400,2829,2400,2600,3150,2700][i]     },
  pipeline:    { expected: [98000,56000,28000,126000,28000,28000,70000,42000][i], achieved: [84000,84000,28000,98000,42000,42000,56000,42000][i] },
  aprPlanned:  [20000,13000,9000,24000,7000,6000,15000,10000][i],
  incDec:      [2000,1000,-1000,2000,1000,1000,1000,1000][i],
}));

const WEEKLY_DATA = [
  { week:"Week 1", spend:28400,  mql:168, expected:180, achieved:168 },
  { week:"Week 2", spend:31200,  mql:192, expected:185, achieved:192 },
  { week:"Week 3", spend:29800,  mql:174, expected:185, achieved:174 },
  { week:"Week 4", spend:33440,  mql:217, expected:190, achieved:217 },
];

const TRENDS_DATA = [
  { date:"2026-03-01", geo:"GCC",     mql:28, sql:3,  costMql:168, costSql:1960, spend:4704,  ctr:2.8, cpc:6.1, cpm:27.4, impressions:171607, clicks:771  },
  { date:"2026-03-01", geo:"N.Africa",mql:34, sql:4,  costMql:118, costSql:1003, spend:4012,  ctr:3.4, cpc:4.8, cpm:21.2, impressions:189245, clicks:836  },
  { date:"2026-03-08", geo:"GCC",     mql:31, sql:3,  costMql:172, costSql:1774, spend:5326,  ctr:2.7, cpc:6.3, cpm:27.9, impressions:190753, clicks:846  },
  { date:"2026-03-08", geo:"N.Africa",mql:38, sql:4,  costMql:122, costSql:1159, spend:4636,  ctr:3.5, cpc:4.9, cpm:21.8, impressions:212661, clicks:946  },
  { date:"2026-03-15", geo:"SEA",     mql:22, sql:2,  costMql:142, costSql:1562, spend:3124,  ctr:3.1, cpc:5.6, cpm:24.4, impressions:127951, clicks:558  },
  { date:"2026-03-15", geo:"Europe",  mql:14, sql:1,  costMql:310, costSql:4340, spend:4340,  ctr:1.9, cpc:8.2, cpm:32.1, impressions:135202, clicks:529  },
  { date:"2026-03-22", geo:"GCC",     mql:36, sql:4,  costMql:166, costSql:1494, spend:5976,  ctr:2.9, cpc:6.2, cpm:27.6, impressions:216522, clicks:964  },
  { date:"2026-03-22", geo:"APAC",    mql:18, sql:1,  costMql:228, costSql:4104, spend:4104,  ctr:2.2, cpc:7.4, cpm:29.8, impressions:137718, clicks:555  },
];

const MEETINGS_DATA = [
  { id:1,  name:"Hassan Al Rashid",   company:"The Grill House Group", date:"2026-04-04", time:"10:00", owner:"Sara K.",  geo:"GCC",     flag:"🇦🇪", priority:"High",     hsUrl:"#" },
  { id:2,  name:"Maria Santos",       company:"Foodmark Philippines",  date:"2026-04-04", time:"14:00", owner:"Ana G.",  geo:"SEA",     flag:"🇵🇭", priority:"Standard", hsUrl:"#" },
  { id:3,  name:"James Thornton",     company:"The Chefs Table",       date:"2026-04-05", time:"09:30", owner:"Liam T.", geo:"Europe",  flag:"🇬🇧", priority:"High",     hsUrl:"#" },
  { id:4,  name:"Fatima Al Zaabi",    company:"Desert Rose Dining",    date:"2026-04-05", time:"11:00", owner:"Sara K.",  geo:"GCC",     flag:"🇦🇪", priority:"High",     hsUrl:"#" },
  { id:5,  name:"Youssef Ben Salah",  company:"Saveur Bistro Group",   date:"2026-04-06", time:"13:00", owner:"Maya L.", geo:"N.Africa",flag:"🇹🇳", priority:"Standard", hsUrl:"#" },
  { id:6,  name:"Priya Nair",         company:"SkyDine Singapore",     date:"2026-04-06", time:"15:30", owner:"Ana G.",  geo:"SEA",     flag:"🇸🇬", priority:"Standard", hsUrl:"#" },
  { id:7,  name:"Omar Khalil",        company:"Almaza Hospitality",    date:"2026-04-07", time:"10:00", owner:"Ahmed R.",geo:"N.Africa",flag:"🇪🇬", priority:"High",     hsUrl:"#" },
  { id:8,  name:"David Munroe",       company:"Fusion Kitchen AU",     date:"2026-04-07", time:"11:30", owner:"Liam T.", geo:"APAC",    flag:"🇦🇺", priority:"Standard", hsUrl:"#" },
  { id:9,  name:"Aisha Mwangi",       company:"Cape Town Eats",        date:"2026-04-08", time:"09:00", owner:"Sara K.",  geo:"Africa",  flag:"🇿🇦", priority:"Standard", hsUrl:"#" },
  { id:10, name:"Tariq Al Sulaiman",  company:"Nando's MENA",          date:"2026-04-08", time:"14:00", owner:"Ahmed R.",geo:"GCC",     flag:"🇸🇦", priority:"High",     hsUrl:"#" },
];

const QUARTERS = ["Q1","Q2","Q3","Q4"];
const MONTHS   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const TREND_METRICS = [
  { key:"mql",         label:"MQL"         },
  { key:"sql",         label:"SQL"         },
  { key:"costMql",     label:"Cost / MQL"  },
  { key:"costSql",     label:"Cost / SQL"  },
  { key:"spend",       label:"Spend"       },
  { key:"ctr",         label:"CTR %"       },
  { key:"cpc",         label:"CPC"         },
  { key:"cpm",         label:"CPM"         },
  { key:"impressions", label:"Impressions" },
  { key:"clicks",      label:"Clicks"      },
];

// ============================================================
// FORMATTERS
// ============================================================
const fmtAED = (v) => `AED ${Number(v).toLocaleString("en", { maximumFractionDigits:0 })}`;
const fmtUSD = (v) => `$${Number(v).toLocaleString("en", { maximumFractionDigits:0 })}`;
const fmtNum = (v) => Number(v).toLocaleString("en", { maximumFractionDigits:0 });
const fmtPct = (v) => `${Number(v).toFixed(1)}%`;

function fmt(value, format) {
  if (format === "aed") return fmtAED(value);
  if (format === "usd") return fmtUSD(value);
  if (format === "pct") return fmtPct(value);
  return fmtNum(value);
}

function delta(expected, achieved) {
  const diff = achieved - expected;
  const pct  = expected ? ((diff / expected) * 100).toFixed(1) : 0;
  return { diff, pct, positive: diff >= 0 };
}

// ============================================================
// SHARED UI ATOMS
// ============================================================
function Tab({ label, active, onClick }) {
  return (
    <button className={`nav-tab ${active ? "active" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}

function KpiCard({ icon, label, value, sub }) {
  return (
    <div className="kpi-card">
      <span className="kpi-icon">{icon}</span>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="section-title">{children}</h3>;
}

function AiBlock({ title, items, color }) {
  return (
    <div className={`ai-block ai-${color}`}>
      <div className="ai-block-label">{title}</div>
      <ul className="ai-block-list">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );
}

function FilterPill({ label, active, onClick }) {
  return (
    <button className={`filter-pill ${active ? "active" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}

// ============================================================
// PAGE: EXECUTIVE SUMMARY
// ============================================================
function ExecutivePage() {
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

// ============================================================
// PAGE: MTD DATA
// ============================================================
function MtdPage() {
  const totals = MTD_DATA.reduce((acc, row) => {
    acc.spendExp  += row.spend.expected;    acc.spendAch  += row.spend.achieved;
    acc.mqlExp    += row.mql.expected;      acc.mqlAch    += row.mql.achieved;
    acc.sqlExp    += row.sql.expected;      acc.sqlAch    += row.sql.achieved;
    acc.pipExp    += row.pipeline.expected; acc.pipAch    += row.pipeline.achieved;
    acc.aprPlan   += row.aprPlanned;        acc.incDec    += row.incDec;
    return acc;
  }, { spendExp:0,spendAch:0,mqlExp:0,mqlAch:0,sqlExp:0,sqlAch:0,pipExp:0,pipAch:0,aprPlan:0,incDec:0 });

  function DeltaCell({ exp, ach, fmtFn }) {
    const d = delta(exp, ach);
    return (
      <td>
        <div className="delta-cell">
          <span>{fmtFn(ach)}</span>
          <span className={`delta-badge ${d.positive ? "pos" : "neg"}`}>
            {d.positive ? "+" : ""}{d.pct}%
          </span>
        </div>
      </td>
    );
  }

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">MTD Performance</h2>
        <span className="page-sub">Expected vs Achieved — April 2026</span>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="data-table mtd-table">
            <thead>
              <tr>
                <th>Geo</th>
                <th>Spend Exp</th><th>Spend Ach</th><th>Δ</th>
                <th>MQL Exp</th><th>MQL Ach</th><th>Δ</th>
                <th>CPL Ach</th>
                <th>SQL%</th>
                <th>SQL Exp</th><th>SQL Ach</th><th>Δ</th>
                <th>CPSQL Ach</th>
                <th>Pipeline Ach</th>
                <th>APR Plan</th>
                <th>Inc/Dec</th>
              </tr>
            </thead>
            <tbody>
              {MTD_DATA.map(row => {
                const sd = delta(row.spend.expected, row.spend.achieved);
                const md = delta(row.mql.expected,   row.mql.achieved);
                const qd = delta(row.sql.expected,    row.sql.achieved);
                return (
                  <tr key={row.geo}>
                    <td><span className="geo-flag">{row.flag}</span> {row.geo}</td>
                    <td className="num-cell dim">{fmtAED(row.spend.expected)}</td>
                    <td className="num-cell">{fmtAED(row.spend.achieved)}</td>
                    <td><span className={`delta-badge ${sd.positive?"pos":"neg"}`}>{sd.positive?"+":""}{sd.pct}%</span></td>
                    <td className="num-cell dim">{row.mql.expected}</td>
                    <td className="num-cell">{row.mql.achieved}</td>
                    <td><span className={`delta-badge ${md.positive?"pos":"neg"}`}>{md.positive?"+":""}{md.pct}%</span></td>
                    <td className="num-cell">{fmtAED(row.costPerMql.achieved)}</td>
                    <td className="num-cell">{fmtPct(row.sqlPct.achieved)}</td>
                    <td className="num-cell dim">{row.sql.expected}</td>
                    <td className="num-cell">{row.sql.achieved}</td>
                    <td><span className={`delta-badge ${qd.positive?"pos":"neg"}`}>{qd.positive?"+":""}{qd.pct}%</span></td>
                    <td className="num-cell">{fmtAED(row.costPerSql.achieved)}</td>
                    <td className="num-cell accent">{fmtUSD(row.pipeline.achieved)}</td>
                    <td className="num-cell">{fmtAED(row.aprPlanned)}</td>
                    <td className={`num-cell ${row.incDec >= 0 ? "pos-text" : "neg-text"}`}>
                      {row.incDec >= 0 ? "+" : ""}{fmtAED(row.incDec)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td>Total</td>
                <td className="num-cell dim">{fmtAED(totals.spendExp)}</td>
                <td className="num-cell">{fmtAED(totals.spendAch)}</td>
                <td></td>
                <td className="num-cell dim">{totals.mqlExp}</td>
                <td className="num-cell">{totals.mqlAch}</td>
                <td></td>
                <td></td><td></td>
                <td className="num-cell dim">{totals.sqlExp}</td>
                <td className="num-cell">{totals.sqlAch}</td>
                <td></td><td></td>
                <td className="num-cell accent">{fmtUSD(totals.pipAch)}</td>
                <td className="num-cell">{fmtAED(totals.aprPlan)}</td>
                <td className={`num-cell ${totals.incDec >= 0 ? "pos-text" : "neg-text"}`}>
                  {totals.incDec >= 0 ? "+" : ""}{fmtAED(totals.incDec)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <div className="ai-grid ai-grid-2">
        <AiBlock color="purple" title="🎯 How to Achieve Monthly Target" items={[
          "Increase DZA/TUN/PHL budgets by 25% — these geos are over-delivering vs expected CPL",
          "UK & AUS are 30%+ over expected CPL — reduce daily caps by AED 500 each",
          "Activate 2 dormant GCC campaigns to close the SQL gap (6 vs 9 expected)",
          "Negotiate pipeline acceleration with Almaza & Cravia — both in final stage",
        ]} />
        <AiBlock color="blue" title="📋 This Week's Actions" items={[
          "Brief media buyer on budget reallocation by Wednesday",
          "Pull APAC creative report — CTR 2.2% is below 3% benchmark",
          "Follow up with 3 stalled proposals in GCC pipeline",
          "Review SEA audience exclusion lists to reduce overlap",
        ]} />
      </div>
    </div>
  );
}

// ============================================================
// PAGE: QTD / MONTHLY
// ============================================================
function QtdPage() {
  const [quarter, setQuarter] = useState("Q1");
  const [month,   setMonth]   = useState("Mar");
  const kpi = KPI_MOCK["30d"];

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">QTD / Monthly View</h2>
      </div>
      <div className="filter-bar">
        {QUARTERS.map(q => <FilterPill key={q} label={q} active={quarter === q} onClick={() => setQuarter(q)} />)}
        <div className="filter-sep" />
        {MONTHS.map(m => <FilterPill key={m} label={m} active={month === m} onClick={() => setMonth(m)} />)}
      </div>
      <div className="ctx-label">Showing: {quarter} · {month} 2026</div>
      <div className="kpi-grid">
        {KPI_CARDS.map(c => (
          <KpiCard key={c.key} icon={c.icon} label={c.label} value={fmt(kpi[c.key], c.fmt)} />
        ))}
      </div>
      <div className="card">
        <SectionTitle>Geo Breakdown — {month} {quarter}</SectionTitle>
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

// ============================================================
// PAGE: TRENDS
// ============================================================
function TrendsPage() {
  const geos     = [...new Set(TRENDS_DATA.map(d => d.geo))];
  const [selectedGeos,    setSelectedGeos]    = useState(geos);
  const [selectedMetric,  setSelectedMetric]  = useState("mql");

  const toggleGeo = (geo) => {
    setSelectedGeos(prev =>
      prev.includes(geo) ? prev.filter(g => g !== geo) : [...prev, geo]
    );
  };

  const filtered = TRENDS_DATA.filter(d => selectedGeos.includes(d.geo));
  const dates    = [...new Set(filtered.map(d => d.date))].sort();
  const metric   = TREND_METRICS.find(m => m.key === selectedMetric);

  const maxVal = Math.max(...filtered.map(d => d[selectedMetric] || 0), 1);

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">Trends</h2>
      </div>

      {/* Geo filter */}
      <div className="filter-bar">
        {geos.map(geo => (
          <FilterPill key={geo} label={geo} active={selectedGeos.includes(geo)} onClick={() => toggleGeo(geo)} />
        ))}
      </div>

      {/* Metric selector */}
      <div className="filter-bar" style={{ marginTop:8 }}>
        {TREND_METRICS.map(m => (
          <FilterPill key={m.key} label={m.label} active={selectedMetric === m.key} onClick={() => setSelectedMetric(m.key)} />
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="card chart-placeholder">
        <SectionTitle>{metric.label} over time</SectionTitle>
        <div className="bar-chart">
          {filtered.map((row, i) => {
            const val = row[selectedMetric] || 0;
            const pct = Math.round((val / maxVal) * 100);
            return (
              <div className="bar-col" key={i}>
                <div className="bar-tooltip">{row.geo}: {val}</div>
                <div className="bar" style={{ height: `${pct}%` }} />
                <div className="bar-label">{row.date.slice(5)} {row.geo}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary table */}
      <div className="card">
        <SectionTitle>Data Table</SectionTitle>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th><th>Geo</th>
                {TREND_METRICS.map(m => <th key={m.key}>{m.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={i}>
                  <td>{row.date}</td>
                  <td><span className="geo-tag">{row.geo}</span></td>
                  {TREND_METRICS.map(m => (
                    <td key={m.key} className="num-cell">
                      {["ctr"].includes(m.key) ? fmtPct(row[m.key]) : fmtNum(row[m.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGE: WEEK ON WEEK
// ============================================================
function WeekPage() {
  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">Week on Week</h2>
        <span className="page-sub">April 2026</span>
      </div>
      <div className="wow-grid">
        {WEEKLY_DATA.map(w => {
          const d = delta(w.expected, w.achieved);
          return (
            <div className="card wow-card" key={w.week}>
              <div className="wow-week">{w.week}</div>
              <div className="wow-row"><span>Spend</span><span className="num-cell">{fmtAED(w.spend)}</span></div>
              <div className="wow-row"><span>MQL</span><span className="num-cell">{w.mql}</span></div>
              <div className="wow-divider" />
              <div className="wow-row"><span>Expected MQL</span><span className="num-cell dim">{w.expected}</span></div>
              <div className="wow-row"><span>Achieved MQL</span><span className="num-cell">{w.achieved}</span></div>
              <div className="wow-row">
                <span>Delta</span>
                <span className={`delta-badge ${d.positive ? "pos" : "neg"}`}>
                  {d.positive ? "+" : ""}{d.diff} ({d.positive ? "+" : ""}{d.pct}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="card">
        <SectionTitle>Weekly Summary Table</SectionTitle>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Week</th><th>Spend</th><th>MQL</th><th>Expected</th><th>Achieved</th><th>Delta</th><th>Δ%</th></tr>
            </thead>
            <tbody>
              {WEEKLY_DATA.map(w => {
                const d = delta(w.expected, w.achieved);
                return (
                  <tr key={w.week}>
                    <td>{w.week}</td>
                    <td className="num-cell">{fmtAED(w.spend)}</td>
                    <td className="num-cell">{w.mql}</td>
                    <td className="num-cell dim">{w.expected}</td>
                    <td className="num-cell">{w.achieved}</td>
                    <td className={`num-cell ${d.positive ? "pos-text" : "neg-text"}`}>
                      {d.positive ? "+" : ""}{d.diff}
                    </td>
                    <td><span className={`delta-badge ${d.positive ? "pos" : "neg"}`}>{d.positive?"+":""}{d.pct}%</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGE: SQL
// ============================================================
function SqlPage() {
  const [qFilter,    setQFilter]    = useState("Q1");
  const [monthFilter,setMonthFilter]= useState(null);
  const [geoFilter,  setGeoFilter]  = useState(null);
  const [sortKey,    setSortKey]    = useState("sqlDate");
  const [sortDir,    setSortDir]    = useState("desc");

  const filtered = useMemo(() => {
    return SQL_DATA.filter(row => {
      if (monthFilter) return row.month === monthFilter;
      return row.quarter === qFilter;
    });
  }, [qFilter, monthFilter]);

  const availableGeos = useMemo(() => {
    return [...new Set(filtered.map(r => r.geo))];
  }, [filtered]);

  const displayRows = useMemo(() => {
    let rows = geoFilter ? filtered.filter(r => r.geo === geoFilter) : filtered;
    return [...rows].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === "string") av = av.toLowerCase(), bv = bv.toLowerCase();
      if (sortDir === "asc") return av > bv ? 1 : -1;
      return av < bv ? 1 : -1;
    });
  }, [filtered, geoFilter, sortKey, sortDir]);

  const kpiSql      = displayRows.length;
  const kpiPipeline = displayRows.reduce((s, r) => s + r.dealValue, 0);
  const kpiAvg      = kpiSql ? Math.round(kpiPipeline / kpiSql) : 0;
  const kpiWon      = displayRows.filter(r => r.stage === "Closed Won").length;

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortTh = ({ k, label }) => (
    <th onClick={() => handleSort(k)} className="sortable-th">
      {label} {sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : ""}
    </th>
  );

  const STAGE_COLORS = { "Closed Won":"stage-won", "Negotiation":"stage-neg", "Proposal":"stage-prop", "Discovery":"stage-disc" };

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">SQL Pipeline</h2>
      </div>

      {/* Primary filter: Q */}
      <div className="filter-bar">
        {QUARTERS.map(q => (
          <FilterPill key={q} label={q}
            active={qFilter === q && !monthFilter}
            onClick={() => { setQFilter(q); setMonthFilter(null); setGeoFilter(null); }}
          />
        ))}
        <div className="filter-sep" />
        {MONTHS.slice(0, 3).map(m => (
          <FilterPill key={m} label={m}
            active={monthFilter === m}
            onClick={() => { setMonthFilter(prev => prev === m ? null : m); setGeoFilter(null); }}
          />
        ))}
      </div>

      {/* Secondary: Geo (dynamic) */}
      {availableGeos.length > 0 && (
        <div className="filter-bar" style={{ marginTop:8 }}>
          <span className="filter-label">Geo:</span>
          {availableGeos.map(g => (
            <FilterPill key={g} label={g}
              active={geoFilter === g}
              onClick={() => setGeoFilter(prev => prev === g ? null : g)}
            />
          ))}
        </div>
      )}

      {/* KPI cards */}
      <div className="kpi-grid kpi-grid-4">
        <KpiCard icon="🏆" label="SQLs"      value={kpiSql} />
        <KpiCard icon="📊" label="Pipeline"  value={fmtUSD(kpiPipeline)} />
        <KpiCard icon="💡" label="Avg Deal"  value={fmtUSD(kpiAvg)} />
        <KpiCard icon="🔒" label="Closed Won" value={kpiWon} />
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <SortTh k="company"    label="Company" />
                <SortTh k="country"    label="Country" />
                <SortTh k="geo"        label="Geo" />
                <SortTh k="campaign"   label="Campaign" />
                <SortTh k="sqlDate"    label="SQL Date" />
                <SortTh k="createdDate" label="Created" />
                <SortTh k="dealValue"  label="Deal Value" />
                <SortTh k="stage"      label="Stage" />
                <SortTh k="owner"      label="Owner" />
                <th>HubSpot</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, i) => (
                <tr key={row.id}>
                  <td className="dim">{i + 1}</td>
                  <td>{row.company}</td>
                  <td><span className="geo-tag">{row.country}</span></td>
                  <td><span className="geo-tag secondary">{row.geo}</span></td>
                  <td className="dim">{row.campaign}</td>
                  <td>{row.sqlDate}</td>
                  <td className="dim">{row.createdDate}</td>
                  <td className="num-cell accent">{fmtUSD(row.dealValue)}</td>
                  <td><span className={`stage-badge ${STAGE_COLORS[row.stage] || ""}`}>{row.stage}</span></td>
                  <td>{row.owner}</td>
                  <td><a className="hs-link" href={row.hsUrl} target="_blank" rel="noreferrer">↗ View</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGE: MEETINGS BOOKED
// ============================================================
function MeetingsPage() {
  const allGeos = [...new Set(MEETINGS_DATA.map(m => m.geo))];
  const [filter, setFilter]  = useState("All");
  const [geoFil, setGeoFil]  = useState(null);

  const today = "2026-04-04";
  const weekEnd = "2026-04-10";

  const displayed = useMemo(() => {
    let rows = MEETINGS_DATA;
    if (filter === "Today")     rows = rows.filter(r => r.date === today);
    if (filter === "This Week") rows = rows.filter(r => r.date >= today && r.date <= weekEnd);
    if (filter === "High")      rows = rows.filter(r => r.priority === "High");
    if (geoFil) rows = rows.filter(r => r.geo === geoFil);
    return rows;
  }, [filter, geoFil]);

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">Meetings Booked</h2>
        <span className="page-sub">{displayed.length} meetings</span>
      </div>

      <div className="filter-bar">
        {["All","Today","This Week","High Priority"].map(f => (
          <FilterPill key={f} label={f}
            active={filter === (f === "High Priority" ? "High" : f) && !geoFil}
            onClick={() => { setFilter(f === "High Priority" ? "High" : f); setGeoFil(null); }}
          />
        ))}
        <div className="filter-sep" />
        {allGeos.map(g => (
          <FilterPill key={g} label={g} active={geoFil === g} onClick={() => setGeoFil(prev => prev === g ? null : g)} />
        ))}
      </div>

      <div className="meetings-grid">
        {displayed.map(m => (
          <div className={`meeting-card ${m.priority === "High" ? "high-priority" : ""}`} key={m.id}>
            <div className="meeting-card-top">
              <span className={`priority-badge ${m.priority === "High" ? "high" : "standard"}`}>
                {m.priority}
              </span>
              <span className="meeting-geo">{m.flag} {m.geo}</span>
            </div>
            <div className="meeting-name">{m.name}</div>
            <div className="meeting-company">{m.company}</div>
            <div className="meeting-meta">
              <span>📅 {m.date} · {m.time}</span>
              <span>👤 {m.owner}</span>
            </div>
            <a className="meeting-link" href={m.hsUrl} target="_blank" rel="noreferrer">
              View in HubSpot ↗
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// ROOT APP
// ============================================================
const TABS = [
  { id:"executive",  label:"Executive Summary" },
  { id:"mtd",        label:"MTD Data"          },
  { id:"qtd",        label:"QTD / Monthly"     },
  { id:"trends",     label:"Trends"            },
  { id:"wow",        label:"Week on Week"      },
  { id:"sql",        label:"SQL"               },
  { id:"meetings",   label:"Meetings Booked"   },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("executive");

  const pages = {
    executive: <ExecutivePage />,
    mtd:       <MtdPage />,
    qtd:       <QtdPage />,
    trends:    <TrendsPage />,
    wow:       <WeekPage />,
    sql:       <SqlPage />,
    meetings:  <MeetingsPage />,
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <div className="brand-icon">S</div>
          <span className="brand-name">Supy Marketing</span>
        </div>
        <nav className="tab-nav">
          {TABS.map(t => (
            <Tab key={t.id} label={t.label} active={activeTab === t.id} onClick={() => setActiveTab(t.id)} />
          ))}
        </nav>
        <div className="header-badge">
          <span className="live-dot" />
          Live Dashboard
        </div>
      </header>
      <main className="app-main">
        {pages[activeTab]}
      </main>
    </div>
  );
}
