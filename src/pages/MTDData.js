import React from "react";

// ── Data ─────────────────────────────────────────────────────
const GEO_LIST = [
  { code:"AE", label:"UAE",   flag:"🇦🇪", region:"GCC"      },
  { code:"SA", label:"KSA",   flag:"🇸🇦", region:"GCC"      },
  { code:"GB", label:"UK",    flag:"🇬🇧", region:"Europe"   },
  { code:"AU", label:"AUS",   flag:"🇦🇺", region:"APAC"     },
  { code:"PH", label:"PHL",   flag:"🇵🇭", region:"SEA"      },
  { code:"DZ", label:"DZA",   flag:"🇩🇿", region:"N.Africa" },
  { code:"TN", label:"TUN",   flag:"🇹🇳", region:"N.Africa" },
  { code:"EG", label:"Egypt", flag:"🇪🇬", region:"N.Africa" },
];

const MTD_DATA = GEO_LIST.map((geo, i) => ({
  geo: geo.label, flag: geo.flag,
  spend:      { expected:[18000,12000,8000,22000,6000,5000,14000,9000][i],  achieved:[16200,14500,6800,19800,7200,7800,12600,8100][i]  },
  mql:        { expected:[80,55,35,90,28,22,60,38][i],                      achieved:[72,68,28,81,34,29,54,33][i]                      },
  costPerMql: { expected:[225,218,229,244,214,227,233,237][i],              achieved:[225,213,243,244,212,269,233,245][i]              },
  sqlPct:     { expected:[9,8,7,10,8,9,8,7][i],                            achieved:[8.3,9.1,7.1,8.6,9.4,10.3,7.8,7.6][i]           },
  sql:        { expected:[7,4,2,9,2,2,5,3][i],                             achieved:[6,6,2,7,3,3,4,3][i]                             },
  costPerSql: { expected:[2571,3000,4000,2444,3000,2500,2800,3000][i],     achieved:[2700,2417,3400,2829,2400,2600,3150,2700][i]     },
  pipeline:   { expected:[98000,56000,28000,126000,28000,28000,70000,42000][i], achieved:[84000,84000,28000,98000,42000,42000,56000,42000][i] },
  aprPlanned: [20000,13000,9000,24000,7000,6000,15000,10000][i],
  incDec:     [2000,1000,-1000,2000,1000,1000,1000,1000][i],
}));

// ── Formatters ────────────────────────────────────────────────
const fmtAED = v => `AED ${Number(v).toLocaleString("en", { maximumFractionDigits:0 })}`;
const fmtUSD = v => `$${Number(v).toLocaleString("en", { maximumFractionDigits:0 })}`;
const fmtPct = v => `${Number(v).toFixed(1)}%`;
function delta(expected, achieved) {
  const diff = achieved - expected;
  const pct  = expected ? ((diff / expected) * 100).toFixed(1) : 0;
  return { diff, pct, positive: diff >= 0 };
}

// ── Page ─────────────────────────────────────────────────────
export default function MTDData() {
  const totals = MTD_DATA.reduce((acc, row) => {
    acc.spendExp += row.spend.expected;    acc.spendAch += row.spend.achieved;
    acc.mqlExp   += row.mql.expected;      acc.mqlAch   += row.mql.achieved;
    acc.sqlExp   += row.sql.expected;      acc.sqlAch   += row.sql.achieved;
    acc.pipAch   += row.pipeline.achieved;
    acc.aprPlan  += row.aprPlanned;        acc.incDec   += row.incDec;
    return acc;
  }, { spendExp:0,spendAch:0,mqlExp:0,mqlAch:0,sqlExp:0,sqlAch:0,pipAch:0,aprPlan:0,incDec:0 });

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
                <th>CPL Ach</th><th>SQL%</th>
                <th>SQL Exp</th><th>SQL Ach</th><th>Δ</th>
                <th>CPSQL Ach</th><th>Pipeline Ach</th>
                <th>APR Plan</th><th>Inc/Dec</th>
              </tr>
            </thead>
            <tbody>
              {MTD_DATA.map(row => {
                const sd = delta(row.spend.expected, row.spend.achieved);
                const md = delta(row.mql.expected,   row.mql.achieved);
                const qd = delta(row.sql.expected,   row.sql.achieved);
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
                <td></td><td></td><td></td>
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
        <div className="ai-block ai-purple">
          <div className="ai-block-label">🎯 How to Achieve Monthly Target</div>
          <ul className="ai-block-list">
            <li>Increase DZA/TUN/PHL budgets by 25% — these geos are over-delivering vs expected CPL</li>
            <li>UK & AUS are 30%+ over expected CPL — reduce daily caps by AED 500 each</li>
            <li>Activate 2 dormant GCC campaigns to close the SQL gap (6 vs 9 expected)</li>
            <li>Negotiate pipeline acceleration with Almaza & Cravia — both in final stage</li>
          </ul>
        </div>
        <div className="ai-block ai-blue">
          <div className="ai-block-label">📋 This Week's Actions</div>
          <ul className="ai-block-list">
            <li>Brief media buyer on budget reallocation by Wednesday</li>
            <li>Pull APAC creative report — CTR 2.2% is below 3% benchmark</li>
            <li>Follow up with 3 stalled proposals in GCC pipeline</li>
            <li>Review SEA audience exclusion lists to reduce overlap</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
