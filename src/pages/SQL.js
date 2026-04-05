import React, { useState, useMemo } from "react";
import { QUARTER_MONTHS } from "../config/constants";
import { fmtUSD, delta } from "../utils/formatters";
import { SQL_DATA } from "../data/sqlData";
import KpiCard from "../components/KpiCard";
import FilterPill from "../components/FilterPill";

const AVAILABLE_QUARTERS = [...new Set(SQL_DATA.map(r => r.quarter))].sort((a, b) => a.localeCompare(b));

const STAGE_COLORS = {
  "Closed Won":  "stage-won",
  "Negotiation": "stage-neg",
  "Proposal":    "stage-prop",
  "Discovery":   "stage-disc",
};

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

  const handleQuarterClick = (q) => {
    setQFilter(q);
    setMonthFilter(null);
    setGeoFilter(null);
  };

  const handleMonthClick = (m) => {
    setMonthFilter(prev => prev === m ? null : m);
    setGeoFilter(null);
  };

  const filtered = useMemo(() => {
    return SQL_DATA.filter(row => {
      if (monthFilter) return row.quarter === qFilter && row.month === monthFilter;
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

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">SQL Pipeline</h2>
      </div>

      <div className="filter-bar">
        {AVAILABLE_QUARTERS.map(q => (
          <FilterPill key={q} label={q}
            active={qFilter === q && !monthFilter}
            onClick={() => handleQuarterClick(q)}
          />
        ))}
        {monthsInQuarter.length > 0 && <div className="filter-sep" />}
        {monthsInQuarter.map(m => (
          <FilterPill key={m} label={m}
            active={monthFilter === m}
            onClick={() => handleMonthClick(m)}
          />
        ))}
      </div>

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

      <div className="kpi-grid kpi-grid-4">
        <KpiCard icon="🏆" label="SQLs"       value={kpiSql} />
        <KpiCard icon="📊" label="Pipeline"   value={fmtUSD(kpiPipeline)} />
        <KpiCard icon="💡" label="Avg Deal"   value={fmtUSD(kpiAvg)} />
        <KpiCard icon="🔒" label="Closed Won" value={kpiWon} />
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
