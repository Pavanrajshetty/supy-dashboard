import React, { useState, useMemo } from "react";
import {
  QUARTER_MONTHS, GEO_DATA, QUARTER_INDEX, AVAILABLE_QUARTERS,
  KPI_SNAPSHOT, KPI_CARDS, fmt, fmtAED, fmtUSD,
} from "../data/qtdMonthlyData";

export default function QTDMonthly() {
  const [quarter, setQuarter] = useState(AVAILABLE_QUARTERS[0] || "Q1");
  const [month,   setMonth]   = useState(null);

  const monthsInQuarter = useMemo(() => {
    const qMonths = QUARTER_MONTHS[quarter] || [];
    return qMonths.filter(m => QUARTER_INDEX.some(r => r.quarter === quarter && r.month === m));
  }, [quarter]);

  const handleQuarterClick = (q) => { setQuarter(q); setMonth(null); };

  const ctxLabel = month
    ? `${quarter} · ${month} 2026`
    : `${quarter} · All months (${monthsInQuarter.join(", ")}) 2026`;

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">QTD / Monthly View</h2>
      </div>

      <div className="filter-bar">
        {AVAILABLE_QUARTERS.map(q => (
          <button key={q} className={`filter-pill ${quarter === q ? "active" : ""}`} onClick={() => handleQuarterClick(q)}>{q}</button>
        ))}
        {monthsInQuarter.length > 0 && <div className="filter-sep" />}
        {monthsInQuarter.map(m => (
          <button key={m} className={`filter-pill ${month === m ? "active" : ""}`} onClick={() => setMonth(prev => prev === m ? null : m)}>{m}</button>
        ))}
      </div>

      <div className="ctx-label">Showing: {ctxLabel}</div>

      <div className="kpi-grid">
        {KPI_CARDS.map(c => (
          <div className="kpi-card" key={c.key}>
            <span className="kpi-icon">{c.icon}</span>
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-value">{fmt(KPI_SNAPSHOT[c.key], c.fmt)}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="section-title">Geo Breakdown — {month ? `${month} ${quarter}` : `All of ${quarter}`}</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Geo</th><th>Spend</th><th>MQL</th><th>CPL</th><th>SQL</th><th>CPSQL</th><th>Pipeline</th></tr>
            </thead>
            <tbody>
              {GEO_DATA.map(row => (
                <tr key={row.geo}>
                  <td><span className="geo-flag">{row.flag}</span> {row.geo}</td>
                  <td className="num-cell">{fmtAED(row.spend.achieved)}</td>
                  <td className="num-cell">{row.mql.achieved}</td>
                  <td className="num-cell">{fmtAED(row.costPerMql.achieved)}</td>
                  <td className="num-cell">{row.sql.achieved}</td>
                  <td className="num-cell">{fmtAED(row.costPerSql.achieved)}</td>
                  <td className="num-cell accent">{fmtUSD(row.pipeline.achieved)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
