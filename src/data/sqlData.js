export const SQL_DATA = [];

export const AVAILABLE_QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

export const QUARTER_MONTHS = {
  Q1: ["Jan", "Feb", "Mar"],
  Q2: ["Apr", "May", "Jun"],
  Q3: ["Jul", "Aug", "Sep"],
  Q4: ["Oct", "Nov", "Dec"],
};

export const STAGE_COLORS = {
  "Sales Qualified Lead": "sql",
  Opportunity: "opportunity",
  "Closed Won": "closed-won",
};

export function fmtUSD(value) {
  return `$${Number(value || 0).toLocaleString()}`;
}

export function sortRows(rows, sortKey, sortDir = "asc") {
  const dir = sortDir === "desc" ? -1 : 1;

  return [...rows].sort((a, b) => {
    const av = a?.[sortKey];
    const bv = b?.[sortKey];

    if (typeof av === "number" && typeof bv === "number") {
      return (av - bv) * dir;
    }

    return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
  });
}
