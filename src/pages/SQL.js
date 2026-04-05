import React, { useState, useMemo } from "react";
import {
  SQL_DATA, AVAILABLE_QUARTERS, QUARTER_MONTHS,
  STAGE_COLORS, fmtUSD, sortRows,
} from "../data/sqlData";

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
    const rows = geoFilter ? filtered.filter(r => r.geo === geoFilter) : filtered;
    return sortRows(rows, sortKey, sortDir);
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
