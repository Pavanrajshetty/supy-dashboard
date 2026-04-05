// ============================================================
// CONSTANTS
// ============================================================

export const GEO_LIST = [
  { code: "AE", label: "UAE", flag: "🇦🇪", region: "GCC" },
  { code: "SA", label: "KSA", flag: "🇸🇦", region: "GCC" },
  { code: "GB", label: "UK",  flag: "🇬🇧", region: "Europe" },
  { code: "AU", label: "AUS", flag: "🇦🇺", region: "APAC" },
  { code: "PH", label: "PHL", flag: "🇵🇭", region: "SEA" },
  { code: "DZ", label: "DZA", flag: "🇩🇿", region: "N.Africa" },
  { code: "TN", label: "TUN", flag: "🇹🇳", region: "N.Africa" },
  { code: "EG", label: "Egypt", flag: "🇪🇬", region: "N.Africa" },
  { code: "SG", label: "SGP", flag: "🇸🇬", region: "SEA" },
  { code: "ZA", label: "ZAF", flag: "🇿🇦", region: "Africa" },
];

export const KPI_MOCK = {
  "1d":  { spend:4820,   impressions:182000,   cpm:26.5, reach:94000,   clicks:740,   cpc:6.5,  leads:28,  cpl:172, sql:3,   costPerSql:1607, pipeline:42000,   closure:8400   },
  "7d":  { spend:31400,  impressions:1180000,  cpm:26.6, reach:610000,  clicks:5100,  cpc:6.2,  leads:198, cpl:159, sql:18,  costPerSql:1744, pipeline:252000,  closure:50400  },
  "30d": { spend:122840, impressions:4200000,  cpm:29.2, reach:1100000, clicks:18430, cpc:6.67, leads:751, cpl:164, sql:63,  costPerSql:1950, pipeline:882000,  closure:176400 },
  "60d": { spend:218000, impressions:7800000,  cpm:27.9, reach:2100000, clicks:34200, cpc:6.37, leads:1340,cpl:163, sql:112, costPerSql:1946, pipeline:1568000, closure:313600 },
  "90d": { spend:310000, impressions:11400000, cpm:27.2, reach:3200000, clicks:51000, cpc:6.08, leads:2010,cpl:154, sql:168, costPerSql:1845, pipeline:2352000, closure:470400 },
};

export const FUNNEL_KEYS = [
  { key:"spend",       label:"Spend",       icon:"💸", fmt:"aed" },
  { key:"impressions", label:"Impressions",  icon:"👁",  fmt:"num" },
  { key:"clicks",      label:"Clicks",       icon:"🖱",  fmt:"num" },
  { key:"leads",       label:"Leads (MQL)",  icon:"✅", fmt:"num" },
  { key:"sql",         label:"SQL",          icon:"🏆", fmt:"num" },
  { key:"pipeline",    label:"Pipeline",     icon:"📈", fmt:"usd" },
  { key:"closure",     label:"Closure",      icon:"🔒", fmt:"usd" },
];

export const KPI_CARDS = [
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

export const TABS = [
  { id:"executive",  label:"Executive Summary" },
  { id:"mtd",        label:"MTD Data"          },
  { id:"qtd",        label:"QTD / Monthly"     },
  { id:"trends",     label:"Trends"            },
  { id:"wow",        label:"Week on Week"      },
  { id:"sql",        label:"SQL"               },
  { id:"meetings",   label:"Meetings Booked"   },
];

export const MONTH_ORDER = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export const QUARTER_MONTHS = {
  Q1:["Jan","Feb","Mar"],
  Q2:["Apr","May","Jun"],
  Q3:["Jul","Aug","Sep"],
  Q4:["Oct","Nov","Dec"],
};

export const TREND_METRICS = [
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
