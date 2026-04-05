import React from "react";
import { MTD_DATA } from "../data/mtdData";
import { fmtAED, fmtUSD, fmtPct, delta } from "../utils/formatters";
import AiBlock from "../components/AiBlock";

export default function MTDData() {
  const totals = MTD_DATA.reduce((acc, row) => {
    acc.spendExp  += row.spend.expected;    acc.spendAch  += row.spend.achieved;
    acc.mqlExp    += row.mql.expected;      acc.mqlAch    += row.mql.achieved;
    acc.sqlExp    += row.sql.expected;      acc.sqlAch    += row.sql.achieved;
    acc.pipExp    += row.pipeline.expected; acc.pipAch    += row.pipeline.achieved;
    acc.aprPlan   += row.aprPlanned;        acc.incDec    += row.incDec;
    return acc;
  }, { spendExp:0,spendAch:0,mqlExp:0,mqlAch:0,sqlExp:0,sqlAch:0,pipExp:0,pipAch:0,aprPlan:0,incDec:0 });

  function DeltaCell({ exp, ach, fmtFn }) {
    const d = delta(exp, ach);
    return (
      <td>
        <div className="delta-cell">
          <span>{fmtFn(ach)}</span>
          <span className={`delta-badge ${d.positive ? "pos" : "neg"}`}>
            {d.positive ? "+" : ""}{d.pct}%
          </span>
        </div>
      </td>
    );
  }

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">MTD Performance</h2>
        <span className="page-sub">Expected vs Achieved — April 2026</span>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="data-table mtd-table">
            <thead>
              <tr>
                <th>Geo</th>
                <th>Spend Exp</th><th>Spend Ach</th><th>Δ</th>
                <th>MQL Exp</th><th>MQL Ach</th><th>Δ</th>
                <th>CPL Ach</th>
                <th>SQL%</th>
                <th>SQL Exp</th><th>SQL Ach</th><th>Δ</th>
                <th>CPSQL Ach</th>
                <th>Pipeline Ach</th>
                <th>APR Plan</th>
                <th>Inc/Dec</th>
              </tr>
            </thead>
            <tbody>
              {MTD_DATA.map(row => {
                const sd = delta(row.spend.expected, row.spend.achieved);
                const md = delta(row.mql.expected,   row.mql.achieved);
                const qd = delta(row.sql.expected,    row.sql.achieved);
                return (
                  <tr key={row.geo}>
                    <td><span className="geo-flag">{row.flag}</span> {row.geo}</td>
                    <td className="num-cell dim">{fmtAED(row.spend.expected)}</td>
                    <td className="num-cell">{fmtAED(row.spend.achieved)}</td>
                    <td><span className={`delta-badge ${sd.positive?"pos":"neg"}`}>{sd.positive?"+":""}{sd.pct}%</span></td>
                    <td className="num-cell dim">{row.mql.expected}</td>
                    <td className="num-cell">{row.mql.achieved}</td>
                    <td><span className={`delta-badge ${md.positive?"pos":"neg"}`}>{md.positive?"+":""}{md.pct}%</span></td>
                    <td className="num-cell">{fmtAED(row.costPerMql.achieved)}</td>
                    <td className="num-cell">{fmtPct(row.sqlPct.achieved)}</td>
                    <td className="num-cell dim">{row.sql.expected}</td>
                    <td className="num-cell">{row.sql.achieved}</td>
                    <td><span className={`delta-badge ${qd.positive?"pos":"neg"}`}>{qd.positive?"+":""}{qd.pct}%</span></td>
                    <td className="num-cell">{fmtAED(row.costPerSql.achieved)}</td>
                    <td className="num-cell accent">{fmtUSD(row.pipeline.achieved)}</td>
                    <td className="num-cell">{fmtAED(row.aprPlanned)}</td>
                    <td className={`num-cell ${row.incDec >= 0 ? "pos-text" : "neg-text"}`}>
                      {row.incDec >= 0 ? "+" : ""}{fmtAED(row.incDec)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td>Total</td>
                <td className="num-cell dim">{fmtAED(totals.spendExp)}</td>
                <td className="num-cell">{fmtAED(totals.spendAch)}</td>
                <td></td>
                <td className="num-cell dim">{totals.mqlExp}</td>
                <td className="num-cell">{totals.mqlAch}</td>
                <td></td>
                <td></td><td></td>
                <td className="num-cell dim">{totals.sqlExp}</td>
                <td className="num-cell">{totals.sqlAch}</td>
                <td></td><td></td>
                <td className="num-cell accent">{fmtUSD(totals.pipAch)}</td>
                <td className="num-cell">{fmtAED(totals.aprPlan)}</td>
                <td className={`num-cell ${totals.incDec >= 0 ? "pos-text" : "neg-text"}`}>
                  {totals.incDec >= 0 ? "+" : ""}{fmtAED(totals.incDec)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <div className="ai-grid ai-grid-2">
        <AiBlock color="purple" title="🎯 How to Achieve Monthly Target" items={[
          "Increase DZA/TUN/PHL budgets by 25% — these geos are over-delivering vs expected CPL",
          "UK & AUS are 30%+ over expected CPL — reduce daily caps by AED 500 each",
          "Activate 2 dormant GCC campaigns to close the SQL gap (6 vs 9 expected)",
          "Negotiate pipeline acceleration with Almaza & Cravia — both in final stage",
        ]} />
        <AiBlock color="blue" title="📋 This Week's Actions" items={[
          "Brief media buyer on budget reallocation by Wednesday",
          "Pull APAC creative report — CTR 2.2% is below 3% benchmark",
          "Follow up with 3 stalled proposals in GCC pipeline",
          "Review SEA audience exclusion lists to reduce overlap",
        ]} />
      </div>
    </div>
  );
}
