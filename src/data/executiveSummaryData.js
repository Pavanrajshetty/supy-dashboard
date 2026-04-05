// ── KPI time-range snapshots ──────────────────────────────────
export const KPI_MOCK = {
  "1d":  { spend:4820,   impressions:182000,   cpm:26.5, reach:94000,   clicks:740,   cpc:6.5,  leads:28,  cpl:172, sql:3,   costPerSql:1607, pipeline:42000,   closure:8400   },
  "7d":  { spend:31400,  impressions:1180000,  cpm:26.6, reach:610000,  clicks:5100,  cpc:6.2,  leads:198, cpl:159, sql:18,  costPerSql:1744, pipeline:252000,  closure:50400  },
  "30d": { spend:122840, impressions:4200000,  cpm:29.2, reach:1100000, clicks:18430, cpc:6.67, leads:751, cpl:164, sql:63,  costPerSql:1950, pipeline:882000,  closure:176400 },
  "60d": { spend:218000, impressions:7800000,  cpm:27.9, reach:2100000, clicks:34200, cpc:6.37, leads:1340,cpl:163, sql:112, costPerSql:1946, pipeline:1568000, closure:313600 },
  "90d": { spend:310000, impressions:11400000, cpm:27.2, reach:3200000, clicks:51000, cpc:6.08, leads:2010,cpl:154, sql:168, costPerSql:1845, pipeline:2352000, closure:470400 },
};

// ── Funnel step definitions ───────────────────────────────────
export const FUNNEL_KEYS = [
  { key:"spend",       label:"Spend",      icon:"💸", fmt:"aed" },
  { key:"impressions", label:"Impressions", icon:"👁",  fmt:"num" },
  { key:"clicks",      label:"Clicks",      icon:"🖱",  fmt:"num" },
  { key:"leads",       label:"Leads (MQL)", icon:"✅", fmt:"num" },
  { key:"sql",         label:"SQL",         icon:"🏆", fmt:"num" },
  { key:"pipeline",    label:"Pipeline",    icon:"📈", fmt:"usd" },
  { key:"closure",     label:"Closure",     icon:"🔒", fmt:"usd" },
];

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

// ── Time range label map ──────────────────────────────────────
export const TIME_LABELS = {
  "1d":"Yesterday",
  "7d":"Last 7d",
  "30d":"Last 30d",
  "60d":"Last 60d",
  "90d":"Last 90d",
};

// ── Top SQL preview rows (shown in Executive funnel split) ────
export const SQL_PREVIEW = [
  { id:1,  company:"The Grill House Group",  country:"UAE",     dealValue:28000, hsUrl:"#" },
  { id:2,  company:"Nando's MENA",           country:"KSA",     dealValue:15500, hsUrl:"#" },
  { id:3,  company:"Cravia Inc.",            country:"UAE",     dealValue:22000, hsUrl:"#" },
  { id:4,  company:"The Chefs Table",        country:"UK",      dealValue:9200,  hsUrl:"#" },
  { id:5,  company:"Zahle Restaurant Group", country:"Algeria", dealValue:18700, hsUrl:"#" },
  { id:6,  company:"Foodmark Philippines",   country:"PHL",     dealValue:11400, hsUrl:"#" },
  { id:7,  company:"Almaza Hospitality",     country:"Egypt",   dealValue:31000, hsUrl:"#" },
  { id:8,  company:"Max's Restaurant Chain", country:"PHL",     dealValue:14200, hsUrl:"#" },
  { id:9,  company:"Desert Rose Dining",     country:"UAE",     dealValue:19500, hsUrl:"#" },
  { id:10, company:"Fusion Kitchen AU",      country:"AUS",     dealValue:12800, hsUrl:"#" },
  { id:11, company:"Nile Group Holdings",    country:"Egypt",   dealValue:23400, hsUrl:"#" },
  { id:12, company:"SkyLine Catering",       country:"KSA",     dealValue:17600, hsUrl:"#" },
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
