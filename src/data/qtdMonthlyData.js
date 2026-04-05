// ── Quarter → months mapping ──────────────────────────────────
export const QUARTER_MONTHS = {
  Q1:["Jan","Feb","Mar"],
  Q2:["Apr","May","Jun"],
  Q3:["Jul","Aug","Sep"],
  Q4:["Oct","Nov","Dec"],
};

// ── Geo list (drives geo breakdown table) ─────────────────────
const GEO_LIST = [
  { label:"UAE",   flag:"🇦🇪" },
  { label:"KSA",   flag:"🇸🇦" },
  { label:"UK",    flag:"🇬🇧" },
  { label:"AUS",   flag:"🇦🇺" },
  { label:"PHL",   flag:"🇵🇭" },
  { label:"DZA",   flag:"🇩🇿" },
  { label:"TUN",   flag:"🇹🇳" },
  { label:"Egypt", flag:"🇪🇬" },
];

// ── Geo breakdown rows (achieved only, used in QTD table) ─────
export const GEO_DATA = GEO_LIST.map((geo, i) => ({
  geo: geo.label, flag: geo.flag,
  spend:      { achieved:[16200,14500,6800,19800,7200,7800,12600,8100][i]  },
  mql:        { achieved:[72,68,28,81,34,29,54,33][i]                      },
  costPerMql: { achieved:[225,213,243,244,212,269,233,245][i]              },
  sql:        { achieved:[6,6,2,7,3,3,4,3][i]                             },
  costPerSql: { achieved:[2700,2417,3400,2829,2400,2600,3150,2700][i]     },
  pipeline:   { achieved:[84000,84000,28000,98000,42000,42000,56000,42000][i] },
}));

// ── Quarter/month index (drives quarter + month filter pills) ─
// Minimal structure — only quarter + month are needed for filter logic
export const QUARTER_INDEX = [
  { quarter:"Q1", month:"Jan" },
  { quarter:"Q1", month:"Jan" },
  { quarter:"Q1", month:"Feb" },
  { quarter:"Q1", month:"Feb" },
  { quarter:"Q1", month:"Mar" },
  { quarter:"Q1", month:"Mar" },
];

// ── Available quarters (derived, used for primary filter pills)
export const AVAILABLE_QUARTERS = [...new Set(QUARTER_INDEX.map(r => r.quarter))].sort();

// ── KPI snapshot (30-day, used for QTD KPI grid) ─────────────
export const KPI_SNAPSHOT = {
  spend:122840, impressions:4200000, cpm:29.2, reach:1100000,
  clicks:18430, cpc:6.67, leads:751, cpl:164, sql:63,
  costPerSql:1950, pipeline:882000, closure:176400,
};

// ── KPI card definitions ──────────────────────────────────────
export const KPI_CARDS = [
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

// ── Formatters ────────────────────────────────────────────────
export const fmtAED = v => `AED ${Number(v).toLocaleString("en", { maximumFractionDigits:0 })}`;
export const fmtUSD = v => `$${Number(v).toLocaleString("en", { maximumFractionDigits:0 })}`;
export const fmtNum = v => Number(v).toLocaleString("en", { maximumFractionDigits:0 });
export function fmt(value, format) {
  if (format === "aed") return fmtAED(value);
  if (format === "usd") return fmtUSD(value);
  return fmtNum(value);
}
