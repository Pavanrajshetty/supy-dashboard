import React from "react";
import { WEEKLY_DATA } from "../data/weekOnWeekData";
import { fmtAED, delta } from "../utils/formatters";
import SectionTitle from "../components/SectionTitle";

export default function WeekOnWeek() {
  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">Week on Week</h2>
        <span className="page-sub">April 2026</span>
      </div>
      <div className="wow-grid">
        {WEEKLY_DATA.map(w => {
          const d = delta(w.expected, w.achieved);
          return (
            <div className="card wow-card" key={w.week}>
              <div className="wow-week">{w.week}</div>
              <div className="wow-row"><span>Spend</span><span className="num-cell">{fmtAED(w.spend)}</span></div>
              <div className="wow-row"><span>MQL</span><span className="num-cell">{w.mql}</span></div>
              <div className="wow-divider" />
              <div className="wow-row"><span>Expected MQL</span><span className="num-cell dim">{w.expected}</span></div>
              <div className="wow-row"><span>Achieved MQL</span><span className="num-cell">{w.achieved}</span></div>
              <div className="wow-row">
                <span>Delta</span>
                <span className={`delta-badge ${d.positive ? "pos" : "neg"}`}>
                  {d.positive ? "+" : ""}{d.diff} ({d.positive ? "+" : ""}{d.pct}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="card">
        <SectionTitle>Weekly Summary Table</SectionTitle>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Week</th><th>Spend</th><th>MQL</th><th>Expected</th><th>Achieved</th><th>Delta</th><th>Δ%</th></tr>
            </thead>
            <tbody>
              {WEEKLY_DATA.map(w => {
                const d = delta(w.expected, w.achieved);
                return (
                  <tr key={w.week}>
                    <td>{w.week}</td>
                    <td className="num-cell">{fmtAED(w.spend)}</td>
                    <td className="num-cell">{w.mql}</td>
                    <td className="num-cell dim">{w.expected}</td>
                    <td className="num-cell">{w.achieved}</td>
                    <td className={`num-cell ${d.positive ? "pos-text" : "neg-text"}`}>
                      {d.positive ? "+" : ""}{d.diff}
                    </td>
                    <td><span className={`delta-badge ${d.positive ? "pos" : "neg"}`}>{d.positive?"+":""}{d.pct}%</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
