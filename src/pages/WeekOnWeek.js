import React from "react";

// ── Data ─────────────────────────────────────────────────────
const WEEKLY_DATA = [
  { week:"Week 1", spend:28400, mql:168, expected:180, achieved:168 },
  { week:"Week 2", spend:31200, mql:192, expected:185, achieved:192 },
  { week:"Week 3", spend:29800, mql:174, expected:185, achieved:174 },
  { week:"Week 4", spend:33440, mql:217, expected:190, achieved:217 },
];

const fmtAED = v => `AED ${Number(v).toLocaleString("en", { maximumFractionDigits:0 })}`;
function delta(expected, achieved) {
  const diff = achieved - expected;
  const pct  = expected ? ((diff / expected) * 100).toFixed(1) : 0;
  return { diff, pct, positive: diff >= 0 };
}

// ── Page ─────────────────────────────────────────────────────
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
        <h3 className="section-title">Weekly Summary Table</h3>
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
