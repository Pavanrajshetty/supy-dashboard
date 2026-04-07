export const QUARTER_MONTHS = {
  Q1: ["Jan", "Feb", "Mar"],
  Q2: ["Apr", "May", "Jun"],
  Q3: ["Jul", "Aug", "Sep"],
  Q4: ["Oct", "Nov", "Dec"],
};

export const QUARTER_INDEX = [
  { quarter: "Q1", month: "Jan" },
  { quarter: "Q1", month: "Feb" },
  { quarter: "Q1", month: "Mar" },
  { quarter: "Q2", month: "Apr" },
  { quarter: "Q2", month: "May" },
  { quarter: "Q2", month: "Jun" },
  { quarter: "Q3", month: "Jul" },
  { quarter: "Q3", month: "Aug" },
  { quarter: "Q3", month: "Sep" },
  { quarter: "Q4", month: "Oct" },
  { quarter: "Q4", month: "Nov" },
  { quarter: "Q4", month: "Dec" },
];

export const AVAILABLE_QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

export const KPI_SNAPSHOT = {
  spend: 0,
  mql: 0,
  cpl: 0,
  sql: 0,
  cpsql: 0,
  pipeline: 0,
};

export const KPI_CARDS = [
  { key: "spend", label: "Spend", icon: "💸", fmt: "aed" },
  { key: "mql", label: "MQL", icon: "📥", fmt: "num" },
  { key: "cpl", label: "CPL", icon: "🧮", fmt: "aed" },
  { key: "sql", label: "SQL", icon: "🏆", fmt: "num" },
  { key: "cpsql", label: "Cost / SQL", icon: "📉", fmt: "aed" },
  { key: "pipeline", label: "Pipeline", icon: "📊", fmt: "usd" },
];

export const GEO_DATA = [];

export function fmt(value, type = "num") {
  if (type === "aed") return fmtAED(value);
  if (type === "usd") return fmtUSD(value);
  return Number(value || 0).toLocaleString();
}

export function fmtAED(value) {
  return `AED ${Number(value || 0).toLocaleString()}`;
}

export function fmtUSD(value) {
  return `$${Number(value || 0).toLocaleString()}`;
}
