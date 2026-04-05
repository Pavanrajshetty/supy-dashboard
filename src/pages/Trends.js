import React, { useState, useMemo } from "react";

// ── Data ─────────────────────────────────────────────────────
const TRENDS_DATA = [
  { date:"2026-03-01", geo:"GCC",      mql:28, sql:3, costMql:168, costSql:1960, spend:4704,  ctr:2.8, cpc:6.1, cpm:27.4, impressions:171607, clicks:771 },
  { date:"2026-03-01", geo:"N.Africa", mql:34, sql:4, costMql:118, costSql:1003, spend:4012,  ctr:3.4, cpc:4.8, cpm:21.2, impressions:189245, clicks:836 },
  { date:"2026-03-08", geo:"GCC",      mql:31, sql:3, costMql:172, costSql:1774, spend:5326,  ctr:2.7, cpc:6.3, cpm:27.9, impressions:190753, clicks:846 },
  { date:"2026-03-08", geo:"N.Africa", mql:38, sql:4, costMql:122, costSql:1159, spend:4636,  ctr:3.5, cpc:4.9, cpm:21.8, impressions:212661, clicks:946 },
  { date:"2026-03-15", geo:"SEA",      mql:22, sql:2, costMql:142, costSql:1562, spend:3124,  ctr:3.1, cpc:5.6, cpm:24.4, impressions:127951, clicks:558 },
  { date:"2026-03-15", geo:"Europe",   mql:14, sql:1, costMql:310, costSql:4340, spend:4340,  ctr:1.9, cpc:8.2, cpm:32.1, impressions:135202, clicks:529 },
  { date:"2026-03-22", geo:"GCC",      mql:36, sql:4, costMql:166, costSql:1494, spend:5976,  ctr:2.9, cpc:6.2, cpm:27.6, impressions:216522, clicks:964 },
  { date:"2026-03-22", geo:"APAC",     mql:18, sql:1, costMql:228, costSql:4104, spend:4104,  ctr:2.2, cpc:7.4, cpm:29.8, impressions:137718, clicks:555 },
];

const TREND_METRICS = [
  { key:"mql",         label:"MQL"         },
  { key:"sql",         label:"SQL"         },
  { key:"costMql",     label:"Cost / MQL"  },
  { key:"costSql",     label:"Cost / SQL"  },
  { key:"spend",       label:"Spend"       },
  { key:"ctr",         label:"CTR %"       },
  { key:"cpc",         label:"CPC"         },
  { key:"cpm",         label:"CPM"         },
  { key:"impressions", label:"Impressions" },
  { key:"clicks",      label:"Clicks"      },
];

const fmtNum = v => Number(v).toLocaleString("en", { maximumFractionDigits:0 });
const fmtPct = v => `${Number(v).toFixed(1)}%`;

// ── Page ─────────────────────────────────────────────────────
export default function Trends() {
  const [dateRange,      setDateRange]      = useState("30d");
  const [selectedGeos,   setSelectedGeos]   = useState(() => [...new Set(TRENDS_DATA.map(d => d.geo))]);
  const [selectedMetric, setSelectedMetric] = useState("mql");

  const geos = [...new Set(TRENDS_DATA.map(d => d.geo))];

  const toggleGeo = geo => setSelectedGeos(prev =>
    prev.includes(geo) ? prev.filter(g => g !== geo) : [...prev, geo]
  );

  const cutoffDate = useMemo(() => {
    const days = { "7d":7, "30d":30, "60d":60, "90d":90 }[dateRange] || 30;
    const dates = TRENDS_DATA.map(d => d.date).sort();
    const latest = new Date(dates[dates.length - 1]);
    const cutoff = new Date(latest);
    cutoff.setDate(cutoff.getDate() - days);
    return cutoff.toISOString().slice(0, 10);
  }, [dateRange]);

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
        {[{v:"7d",l:"Last 7 days"},{v:"30d",l:"Last 30 days"},{v:"60d",l:"Last 60 days"},{v:"90d",l:"Last 90 days"}].map(r => (
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
