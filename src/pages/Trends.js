import React, { useState, useMemo } from "react";
import { TREND_METRICS, MONTH_ORDER, QUARTER_MONTHS } from "../config/constants";
import { fmtNum, fmtPct } from "../utils/formatters";
import { TRENDS_DATA } from "../data/trendsData";
import SectionTitle from "../components/SectionTitle";
import FilterPill from "../components/FilterPill";

const trendsMonthsPresent = [...new Set(TRENDS_DATA.map(r => {
  const m = new Date(r.date).getMonth();
  return MONTH_ORDER[m];
}))];
export const AVAILABLE_QUARTERS_TRENDS = Object.entries(QUARTER_MONTHS)
  .filter(([, months]) => months.some(m => trendsMonthsPresent.includes(m)))
  .map(([q]) => q)
  .sort();

export default function Trends() {
  const [dateRange,      setDateRange]      = useState("30d");
  const [selectedGeos,   setSelectedGeos]   = useState(() => [...new Set(TRENDS_DATA.map(d => d.geo))]);
  const [selectedMetric, setSelectedMetric] = useState("mql");

  const geos = [...new Set(TRENDS_DATA.map(d => d.geo))];

  const toggleGeo = (geo) => {
    setSelectedGeos(prev =>
      prev.includes(geo) ? prev.filter(g => g !== geo) : [...prev, geo]
    );
  };

  const cutoffDate = useMemo(() => {
    const days = { "7d":7, "30d":30, "60d":60, "90d":90 }[dateRange] || 30;
    const dates = TRENDS_DATA.map(d => d.date).sort();
    const latest = new Date(dates[dates.length - 1]);
    const cutoff = new Date(latest);
    cutoff.setDate(cutoff.getDate() - days);
    return cutoff.toISOString().slice(0, 10);
  }, [dateRange]);

  const filtered = useMemo(() => {
    return TRENDS_DATA.filter(d =>
      selectedGeos.includes(d.geo) && d.date >= cutoffDate
    );
  }, [selectedGeos, cutoffDate]);

  const metric = TREND_METRICS.find(m => m.key === selectedMetric);
  const maxVal = Math.max(...filtered.map(d => d[selectedMetric] || 0), 1);

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">Trends</h2>
      </div>

      <div className="filter-bar">
        {[
          { v:"7d",  l:"Last 7 days"  },
          { v:"30d", l:"Last 30 days" },
          { v:"60d", l:"Last 60 days" },
          { v:"90d", l:"Last 90 days" },
        ].map(r => (
          <FilterPill key={r.v} label={r.l} active={dateRange === r.v} onClick={() => setDateRange(r.v)} />
        ))}
      </div>

      <div className="filter-bar">
        {geos.map(geo => (
          <FilterPill key={geo} label={geo} active={selectedGeos.includes(geo)} onClick={() => toggleGeo(geo)} />
        ))}
      </div>

      <div className="filter-bar" style={{ marginTop:8 }}>
        {TREND_METRICS.map(m => (
          <FilterPill key={m.key} label={m.label} active={selectedMetric === m.key} onClick={() => setSelectedMetric(m.key)} />
        ))}
      </div>

      <div className="card chart-placeholder">
        <SectionTitle>{metric.label} over time</SectionTitle>
        <div className="bar-chart">
          {filtered.map((row, i) => {
            const val = row[selectedMetric] || 0;
            const pct = Math.round((val / maxVal) * 100);
            return (
              <div className="bar-col" key={i}>
                <div className="bar-tooltip">{row.geo}: {val}</div>
                <div className="bar" style={{ height: `${pct}%` }} />
                <div className="bar-label">{row.date.slice(5)} {row.geo}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <SectionTitle>Data Table</SectionTitle>
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
                      {["ctr"].includes(m.key) ? fmtPct(row[m.key]) : fmtNum(row[m.key])}
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
