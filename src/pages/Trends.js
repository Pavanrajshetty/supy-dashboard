import React, { useState, useMemo } from "react";
import {
  TRENDS_DATA, TREND_METRICS, DATE_RANGES,
  getCutoffDate, fmtNum, fmtPct,
} from "../data/trendsData";

// ── Inline SVG line chart — light theme colors ────────────────
function LineChart({ data, metricKey }) {
  const W = 800, H = 160, PAD = { top: 20, right: 16, bottom: 40, left: 8 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top  - PAD.bottom;

  if (!data.length) return null;

  const vals   = data.map(d => d[metricKey] || 0);
  const maxVal = Math.max(...vals, 1);

  const xStep = innerW / Math.max(data.length - 1, 1);
  const yOf   = v => PAD.top + innerH - (v / maxVal) * innerH;
  const xOf   = i => PAD.left + (data.length === 1 ? innerW / 2 : i * xStep);

  const points = data.map((d, i) => `${xOf(i)},${yOf(d[metricKey] || 0)}`).join(" ");

  const fillPoints = [
    `${xOf(0)},${PAD.top + innerH}`,
    ...data.map((d, i) => `${xOf(i)},${yOf(d[metricKey] || 0)}`),
    `${xOf(data.length - 1)},${PAD.top + innerH}`,
  ].join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: H, overflow: "visible" }}
      aria-label="line chart"
    >
      {/* soft area fill */}
      <polygon points={fillPoints} fill="rgba(124,79,214,0.08)" />

      {/* line */}
      <polyline
        points={points}
        fill="none"
        stroke="#7c4fd6"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* dots + tooltips */}
      {data.map((d, i) => {
        const cx  = xOf(i);
        const cy  = yOf(d[metricKey] || 0);
        const val = d[metricKey] || 0;
        const lbl = `${d.date.slice(5)} ${d.geo}`;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={4} fill="#7c4fd6" stroke="#ffffff" strokeWidth={2} />
            <circle cx={cx} cy={cy} r={14} fill="transparent">
              <title>{d.geo}: {val}</title>
            </circle>
            <text
              x={cx}
              y={PAD.top + innerH + 14}
              textAnchor="middle"
              fontSize="9"
              fill="#a099b5"
            >
              {lbl}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Page ─────────────────────────────────────────────────────
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
        <LineChart data={filtered} metricKey={selectedMetric} />
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
