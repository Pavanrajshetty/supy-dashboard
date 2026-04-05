import React, { useState, useMemo } from "react";
import {
  TRENDS_DATA, TREND_METRICS, DATE_RANGES,
  getCutoffDate, fmtNum, fmtPct,
} from "../data/trendsData";

export default function Trends() {
  const [dateRange,      setDateRange]      = useState("30d");
  const [selectedGeos,   setSelectedGeos]   = useState(() => [...new Set(TRENDS_DATA.map(d => d.geo))]);
  const [selectedMetric, setSelectedMetric] = useState("mql");

  const geos = [...new Set(TRENDS_DATA.map(d => d.geo))];

  const toggleGeo = geo => setSelectedGeos(prev =>
    prev.includes(geo) ? prev.filter(g => g !== geo) : [...prev, geo]
  );

  const cutoffDate = useMemo(() => getCutoffDate(dateRange), [dateRange]);

  const filtered = useMemo(() =>
    TRENDS_DATA.filter(d => selectedGeos.includes(d.geo) && d.date >= cutoffDate),
    [selectedGeos, cutoffDate]
  );

  const metric = TREND_METRICS.find(m => m.key === selectedMetric);
  const maxVal = Math.max(...filtered.map(d => d[selectedMetric] || 0), 1);

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">Trends</h2>
      </div>

      <div className="filter-bar">
        {DATE_RANGES.map(r => (
          <button key={r.v} className={`filter-pill ${dateRange === r.v ? "active" : ""}`} onClick={() => setDateRange(r.v)}>{r.l}</button>
        ))}
      </div>

      <div className="filter-bar">
        {geos.map(geo => (
          <button key={geo} className={`filter-pill ${selectedGeos.includes(geo) ? "active" : ""}`} onClick={() => toggleGeo(geo)}>{geo}</button>
        ))}
      </div>

      <div className="filter-bar" style={{ marginTop:8 }}>
        {TREND_METRICS.map(m => (
          <button key={m.key} className={`filter-pill ${selectedMetric === m.key ? "active" : ""}`} onClick={() => setSelectedMetric(m.key)}>{m.label}</button>
        ))}
      </div>

      <div className="card chart-placeholder">
        <h3 className="section-title">{metric.label} over time</h3>
        <div className="bar-chart">
          {filtered.map((row, i) => {
            const val = row[selectedMetric] || 0;
            const pct = Math.round((val / maxVal) * 100);
            return (
              <div className="bar-col" key={i}>
                <div className="bar-tooltip">{row.geo}: {val}</div>
                <div className="bar" style={{ height:`${pct}%` }} />
                <div className="bar-label">{row.date.slice(5)} {row.geo}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">Data Table</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th><th>Geo</th>
                {TREND_METRICS.map(m => <th key={m.key}>{m.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={i}>
                  <td>{row.date}</td>
                  <td><span className="geo-tag">{row.geo}</span></td>
                  {TREND_METRICS.map(m => (
                    <td key={m.key} className="num-cell">
                      {m.key === "ctr" ? fmtPct(row[m.key]) : fmtNum(row[m.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
