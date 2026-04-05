// ── Weekly geo-level performance rows ────────────────────────
export const TRENDS_DATA = [
  { date:"2026-03-01", geo:"GCC",      mql:28, sql:3, costMql:168, costSql:1960, spend:4704,  ctr:2.8, cpc:6.1, cpm:27.4, impressions:171607, clicks:771 },
  { date:"2026-03-01", geo:"N.Africa", mql:34, sql:4, costMql:118, costSql:1003, spend:4012,  ctr:3.4, cpc:4.8, cpm:21.2, impressions:189245, clicks:836 },
  { date:"2026-03-08", geo:"GCC",      mql:31, sql:3, costMql:172, costSql:1774, spend:5326,  ctr:2.7, cpc:6.3, cpm:27.9, impressions:190753, clicks:846 },
  { date:"2026-03-08", geo:"N.Africa", mql:38, sql:4, costMql:122, costSql:1159, spend:4636,  ctr:3.5, cpc:4.9, cpm:21.8, impressions:212661, clicks:946 },
  { date:"2026-03-15", geo:"SEA",      mql:22, sql:2, costMql:142, costSql:1562, spend:3124,  ctr:3.1, cpc:5.6, cpm:24.4, impressions:127951, clicks:558 },
  { date:"2026-03-15", geo:"Europe",   mql:14, sql:1, costMql:310, costSql:4340, spend:4340,  ctr:1.9, cpc:8.2, cpm:32.1, impressions:135202, clicks:529 },
  { date:"2026-03-22", geo:"GCC",      mql:36, sql:4, costMql:166, costSql:1494, spend:5976,  ctr:2.9, cpc:6.2, cpm:27.6, impressions:216522, clicks:964 },
  { date:"2026-03-22", geo:"APAC",     mql:18, sql:1, costMql:228, costSql:4104, spend:4104,  ctr:2.2, cpc:7.4, cpm:29.8, impressions:137718, clicks:555 },
];

// ── Metric selector definitions ───────────────────────────────
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

// ── Date-range options ────────────────────────────────────────
export const DATE_RANGES = [
  { v:"7d",  l:"Last 7 days"  },
  { v:"30d", l:"Last 30 days" },
  { v:"60d", l:"Last 60 days" },
  { v:"90d", l:"Last 90 days" },
];

// ── Cutoff date helper ────────────────────────────────────────
export function getCutoffDate(dateRange) {
  const days = { "7d":7, "30d":30, "60d":60, "90d":90 }[dateRange] || 30;
  const dates = TRENDS_DATA.map(d => d.date).sort();
  const latest = new Date(dates[dates.length - 1]);
  const cutoff = new Date(latest);
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff.toISOString().slice(0, 10);
}

// ── Formatters ────────────────────────────────────────────────
export const fmtNum = v => Number(v).toLocaleString("en", { maximumFractionDigits:0 });
export const fmtPct = v => `${Number(v).toFixed(1)}%`;
