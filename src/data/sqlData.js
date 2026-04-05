// ── Quarter → months mapping ──────────────────────────────────
export const QUARTER_MONTHS = {
  Q1:["Jan","Feb","Mar"],
  Q2:["Apr","May","Jun"],
  Q3:["Jul","Aug","Sep"],
  Q4:["Oct","Nov","Dec"],
};

// ── SQL pipeline rows ─────────────────────────────────────────
export const SQL_DATA = [
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
  { id:13, company:"Hanoi Street Kitchen",   country:"SGP",     geo:"SEA",      campaign:"SEA-TOFU-Meta",  sqlDate:"2026-01-28", createdDate:"2026-01-18", dealValue:8900,  stage:"Discovery",   owner:"Ana G.",  quarter:"Q1", month:"Jan", hsUrl:"#" },
  { id:14, company:"Cape Town Eats",         country:"ZAF",     geo:"Africa",   campaign:"AF-TOFU-Meta",   sqlDate:"2026-01-20", createdDate:"2026-01-10", dealValue:10200, stage:"Proposal",    owner:"Sara K.",  quarter:"Q1", month:"Jan", hsUrl:"#" },
  { id:15, company:"Saveur Bistro Group",    country:"Tunisia", geo:"N.Africa", campaign:"NA-TOFU-Meta",   sqlDate:"2026-01-15", createdDate:"2026-01-05", dealValue:16700, stage:"Negotiation", owner:"Maya L.", quarter:"Q1", month:"Jan", hsUrl:"#" },
];

// ── Available quarters (derived from data) ────────────────────
export const AVAILABLE_QUARTERS = [...new Set(SQL_DATA.map(r => r.quarter))].sort();

// ── Stage → CSS class map ─────────────────────────────────────
export const STAGE_COLORS = {
  "Closed Won":  "stage-won",
  "Negotiation": "stage-neg",
  "Proposal":    "stage-prop",
  "Discovery":   "stage-disc",
};

// ── Formatter ─────────────────────────────────────────────────
export const fmtUSD = v => `$${Number(v).toLocaleString("en", { maximumFractionDigits:0 })}`;

// ── Sort helper ───────────────────────────────────────────────
export function sortRows(rows, sortKey, sortDir) {
  return [...rows].sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (typeof av === "string") { av = av.toLowerCase(); bv = bv.toLowerCase(); }
    if (sortDir === "asc") return av > bv ? 1 : -1;
    return av < bv ? 1 : -1;
  });
}
