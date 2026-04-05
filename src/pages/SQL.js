import React, { useState, useMemo } from "react";

// ── Data ─────────────────────────────────────────────────────
const QUARTER_MONTHS = { Q1:["Jan","Feb","Mar"], Q2:["Apr","May","Jun"], Q3:["Jul","Aug","Sep"], Q4:["Oct","Nov","Dec"] };

const SQL_DATA = [
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

const AVAILABLE_QUARTERS = [...new Set(SQL_DATA.map(r => r.quarter))].sort();

const STAGE_COLORS = { "Closed Won":"stage-won", "Negotiation":"stage-neg", "Proposal":"stage-prop", "Discovery":"stage-disc" };

const fmtUSD = v => `$${Number(v).toLocaleString("en", { maximumFractionDigits:0 })}`;

// ── Page ─────────────────────────────────────────────────────
export default function SQL() {
  const [qFilter,     setQFilter]     = useState(AVAILABLE_QUARTERS[0] || "Q1");
  const [monthFilter, setMonthFilter] = useState(null);
  const [geoFilter,   setGeoFilter]   = useState(null);
  const [sortKey,     setSortKey]     = useState("sqlDate");
  const [sortDir,     setSortDir]     = useState("desc");

  const monthsInQuarter = useMemo(() => {
    const qMonths = QUARTER_MONTHS[qFilter] || [];
    return qMonths.filter(m => SQL_DATA.some(r => r.quarter === qFilter && r.month === m));
  }, [qFilter]);

  const handleQuarterClick = q => { setQFilter(q); setMonthFilter(null); setGeoFilter(null); };
  const handleMonthClick   = m => { setMonthFilter(prev => prev === m ? null : m); setGeoFilter(null); };

  const filtered = useMemo(() =>
    SQL_DATA.filter(row => monthFilter
      ? row.quarter === qFilter && row.month === monthFilter
      : row.quarter === qFilter
    ), [qFilter, monthFilter]
  );

  const availableGeos = useMemo(() => [...new Set(filtered.map(r => r.geo))], [filtered]);

  const displayRows = useMemo(() => {
    let rows = geoFilter ? filtered.filter(r => r.geo === geoFilter) : filtered;
    return [...rows].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === "string") { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      if (sortDir === "asc") return av > bv ? 1 : -1;
      return av < bv ? 1 : -1;
    });
  }, [filtered, geoFilter, sortKey, sortDir]);

  const kpiSql      = displayRows.length;
  const kpiPipeline = displayRows.reduce((s, r) => s + r.dealValue, 0);
  const kpiAvg      = kpiSql ? Math.round(kpiPipeline / kpiSql) : 0;
  const kpiWon      = displayRows.filter(r => r.stage === "Closed Won").length;

  const handleSort = key => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortTh = ({ k, label }) => (
    <th onClick={() => handleSort(k)} className="sortable-th">
      {label} {sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : ""}
    </th>
  );

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">SQL Pipeline</h2>
      </div>

      <div className="filter-bar">
        {AVAILABLE_QUARTERS.map(q => (
          <button key={q} className={`filter-pill ${qFilter===q && !monthFilter ? "active" : ""}`} onClick={() => handleQuarterClick(q)}>{q}</button>
        ))}
        {monthsInQuarter.length > 0 && <div className="filter-sep" />}
        {monthsInQuarter.map(m => (
          <button key={m} className={`filter-pill ${monthFilter===m ? "active" : ""}`} onClick={() => handleMonthClick(m)}>{m}</button>
        ))}
      </div>

      {availableGeos.length > 0 && (
        <div className="filter-bar" style={{ marginTop:8 }}>
          <span className="filter-label">Geo:</span>
          {availableGeos.map(g => (
            <button key={g} className={`filter-pill ${geoFilter===g ? "active" : ""}`} onClick={() => setGeoFilter(prev => prev===g ? null : g)}>{g}</button>
          ))}
        </div>
      )}

      <div className="kpi-grid kpi-grid-4">
        <div className="kpi-card"><span className="kpi-icon">🏆</span><div className="kpi-label">SQLs</div><div className="kpi-value">{kpiSql}</div></div>
        <div className="kpi-card"><span className="kpi-icon">📊</span><div className="kpi-label">Pipeline</div><div className="kpi-value">{fmtUSD(kpiPipeline)}</div></div>
        <div className="kpi-card"><span className="kpi-icon">💡</span><div className="kpi-label">Avg Deal</div><div className="kpi-value">{fmtUSD(kpiAvg)}</div></div>
        <div className="kpi-card"><span className="kpi-icon">🔒</span><div className="kpi-label">Closed Won</div><div className="kpi-value">{kpiWon}</div></div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <SortTh k="company"     label="Company" />
                <SortTh k="country"     label="Country" />
                <SortTh k="geo"         label="Geo" />
                <SortTh k="campaign"    label="Campaign" />
                <SortTh k="sqlDate"     label="SQL Date" />
                <SortTh k="createdDate" label="Created" />
                <SortTh k="dealValue"   label="Deal Value" />
                <SortTh k="stage"       label="Stage" />
                <SortTh k="owner"       label="Owner" />
                <th>HubSpot</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, i) => (
                <tr key={row.id}>
                  <td className="dim">{i+1}</td>
                  <td>{row.company}</td>
                  <td><span className="geo-tag">{row.country}</span></td>
                  <td><span className="geo-tag secondary">{row.geo}</span></td>
                  <td className="dim">{row.campaign}</td>
                  <td>{row.sqlDate}</td>
                  <td className="dim">{row.createdDate}</td>
                  <td className="num-cell accent">{fmtUSD(row.dealValue)}</td>
                  <td><span className={`stage-badge ${STAGE_COLORS[row.stage]||""}`}>{row.stage}</span></td>
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
