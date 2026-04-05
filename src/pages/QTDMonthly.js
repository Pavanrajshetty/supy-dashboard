import React, { useState, useMemo } from "react";
import { KPI_MOCK, KPI_CARDS, QUARTER_MONTHS } from "../config/constants";
import { fmt, fmtAED, fmtUSD } from "../utils/formatters";
import { SQL_DATA } from "../data/sqlData";
import { MTD_DATA } from "../data/mtdData";
import KpiCard from "../components/KpiCard";
import SectionTitle from "../components/SectionTitle";
import FilterPill from "../components/FilterPill";

const AVAILABLE_QUARTERS = [...new Set(SQL_DATA.map(r => r.quarter))].sort((a, b) => a.localeCompare(b));

export default function QTDMonthly() {
  const [quarter, setQuarter] = useState(AVAILABLE_QUARTERS[0] || "Q1");
  const [month,   setMonth]   = useState(null);

  const monthsInQuarter = useMemo(() => {
    const qMonths = QUARTER_MONTHS[quarter] || [];
    return qMonths.filter(m => SQL_DATA.some(r => r.quarter === quarter && r.month === m));
  }, [quarter]);

  const handleQuarterClick = (q) => {
    setQuarter(q);
    setMonth(null);
  };

  const kpi = KPI_MOCK["30d"];

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
          <FilterPill key={q} label={q} active={quarter === q} onClick={() => handleQuarterClick(q)} />
        ))}
        {monthsInQuarter.length > 0 && <div className="filter-sep" />}
        {monthsInQuarter.map(m => (
          <FilterPill
            key={m}
            label={m}
            active={month === m}
            onClick={() => setMonth(prev => prev === m ? null : m)}
          />
        ))}
      </div>

      <div className="ctx-label">Showing: {ctxLabel}</div>

      <div className="kpi-grid">
        {KPI_CARDS.map(c => (
          <KpiCard key={c.key} icon={c.icon} label={c.label} value={fmt(kpi[c.key], c.fmt)} />
        ))}
      </div>

      <div className="card">
        <SectionTitle>
          Geo Breakdown — {month ? `${month} ${quarter}` : `All of ${quarter}`}
        </SectionTitle>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Geo</th><th>Spend</th><th>MQL</th><th>CPL</th><th>SQL</th><th>CPSQL</th><th>Pipeline</th></tr>
            </thead>
            <tbody>
              {MTD_DATA.map(row => (
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
