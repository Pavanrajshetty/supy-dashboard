export const TRENDS_DATA = [];

export const TREND_METRICS = [
  { key: "spend", label: "Spend" },
  { key: "mql", label: "MQL" },
  { key: "sql", label: "SQL" },
  { key: "ctr", label: "CTR" },
];

export const DATE_RANGES = [
  { v: "7d", l: "7D" },
  { v: "30d", l: "30D" },
  { v: "60d", l: "60D" },
  { v: "90d", l: "90D" },
];

export function getCutoffDate(range) {
  const now = new Date();
  const daysMap = { "7d": 7, "30d": 30, "60d": 60, "90d": 90 };
  const days = daysMap[range] || 30;
  now.setDate(now.getDate() - (days - 1));
  return now.toISOString().slice(0, 10);
}

export function fmtNum(value) {
  return Number(value || 0).toLocaleString();
}

export function fmtPct(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}
