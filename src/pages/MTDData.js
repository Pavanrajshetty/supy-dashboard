import React, { useMemo } from "react";

/* =========================
   FAKE DATA
========================= */

const SUMMARY = {
  month: "April 2026",
  spend: { mop: 19900, live: 17650, actual: 8850 },
  mql: { mop: 597, live: 472, actual: 263 },
  sql: { mop: 59, live: 41, actual: 12 },
  pipeline: { actual: 48200 },
};

const GEO_DATA = [
  {
    geo: "United Kingdom",
    flag: "🇬🇧",
    mopBudget: 2500,
    liveBudget: 3200,
    actualSpend: 1361,
    mopMql: 13,
    liveMql: 18,
    actualMql: 8,
    mopSql: 3,
    liveSql: 4,
    actualSql: 1,
    pipeline: 12000,
    status: "Scaling",
    reason: "Good quality traffic, budget increased mid-month",
  },
  {
    geo: "Australia",
    flag: "🇦🇺",
    mopBudget: 2500,
    liveBudget: 2200,
    actualSpend: 1366,
    mopMql: 24,
    liveMql: 20,
    actualMql: 11,
    mopSql: 3,
    liveSql: 2,
    actualSql: 1,
    pipeline: 9000,
    status: "Reduced",
    reason: "CPL high, budget trimmed",
  },
  {
    geo: "Philippines",
    flag: "🇵🇭",
    mopBudget: 1950,
    liveBudget: 2100,
    actualSpend: 945,
    mopMql: 100,
    liveMql: 115,
    actualMql: 100,
    mopSql: 15,
    liveSql: 12,
    actualSql: 2,
    pipeline: 3500,
    status: "Stable",
    reason: "Strong MQL volume but SQL lagging",
  },
  {
    geo: "Singapore",
    flag: "🇸🇬",
    mopBudget: 900,
    liveBudget: 500,
    actualSpend: 743,
    mopMql: 17,
    liveMql: 8,
    actualMql: 1,
    mopSql: 4,
    liveSql: 1,
    actualSql: 1,
    pipeline: 2800,
    status: "Reduced",
    reason: "Volume weak, budget cut",
  },
  {
    geo: "Morocco",
    flag: "🇲🇦",
    mopBudget: 600,
    liveBudget: 180,
    actualSpend: 272,
    mopMql: 82,
    liveMql: 25,
    actualMql: 49,
    mopSql: 3,
    liveSql: 1,
    actualSql: 1,
    pipeline: 1600,
    status: "Paused",
    reason: "Paused due to quality/performance dip",
  },
  {
    geo: "Mauritius",
    flag: "🇲🇺",
    mopBudget: 350,
    liveBudget: 120,
    actualSpend: 230,
    mopMql: 11,
    liveMql: 4,
    actualMql: 5,
    mopSql: 1,
    liveSql: 0,
    actualSql: 0,
    pipeline: 0,
    status: "Paused",
    reason: "Paused mid-month",
  },
];

/* =========================
   HELPERS
========================= */

function fmtAED(value) {
  return `AED ${Number(value || 0).toLocaleString()}`;
}

function fmtUSD(value) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function fmtNum(value) {
  return Number(value || 0).toLocaleString();
}

function pctDelta(expected, actual) {
  if (!expected) return 0;
  return Math.round(((actual - expected) / expected) * 100);
}

function varianceLabel(expected, actual) {
  const val = pctDelta(expected, actual);
  return `${val > 0 ? "+" : ""}${val}%`;
}

function getStatusClass(status) {
  const s = status.toLowerCase();
  if (s === "scaling") return "pill scaling";
  if (s === "reduced") return "pill reduced";
  if (s === "paused") return "pill paused";
  return "pill stable";
}

function getDeltaClass(value) {
  if (value > 0) return "delta-pos";
  if (value < 0) return "delta-neg";
  return "delta-neutral";
}

function safeDivide(a, b) {
  if (!b) return 0;
  return a / b;
}

/* =========================
   COMPONENT
========================= */

export default function MTDDataRevamp() {
  const computed = useMemo(() => {
    const totals = GEO_DATA.reduce(
      (acc, row) => {
        acc.mopBudget += row.mopBudget;
        acc.liveBudget += row.liveBudget;
        acc.actualSpend += row.actualSpend;
        acc.mopMql += row.mopMql;
        acc.liveMql += row.liveMql;
        acc.actualMql += row.actualMql;
        acc.mopSql += row.mopSql;
        acc.liveSql += row.liveSql;
        acc.actualSql += row.actualSql;
        acc.pipeline += row.pipeline;
        return acc;
      },
      {
        mopBudget: 0,
        liveBudget: 0,
        actualSpend: 0,
        mopMql: 0,
        liveMql: 0,
        actualMql: 0,
        mopSql: 0,
        liveSql: 0,
        actualSql: 0,
        pipeline: 0,
      }
    );

    const spendVar = pctDelta(totals.liveBudget, totals.actualSpend);
    const mqlVar = pctDelta(totals.liveMql, totals.actualMql);
    const sqlVar = pctDelta(totals.liveSql, totals.actualSql);

    const bestGeo = [...GEO_DATA].sort(
      (a, b) =>
        safeDivide(b.actualMql, b.actualSpend) - safeDivide(a.actualMql, a.actualSpend)
    )[0];

    const riskGeo = [...GEO_DATA].sort(
      (a, b) => pctDelta(a.liveMql, a.actualMql) - pctDelta(b.liveMql, b.actualMql)
    )[0];

    const paused = GEO_DATA.filter((x) => x.status === "Paused").length;
    const scaled = GEO_DATA.filter((x) => x.status === "Scaling").length;
    const reduced = GEO_DATA.filter((x) => x.status === "Reduced").length;

    return {
      totals,
      spendVar,
      mqlVar,
      sqlVar,
      bestGeo,
      riskGeo,
      paused,
      scaled,
      reduced,
    };
  }, []);

  return (
    <div className="mtd-page">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Inter, Arial, sans-serif; }
        
        .mtd-page {
          padding: 24px;
          background: #f6f8fb;
          min-height: 100vh;
          color: #172033;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 20px;
        }

        .header-left h1 {
          margin: 0 0 6px;
          font-size: 28px;
          line-height: 1.2;
        }

        .header-left p {
          margin: 0;
          color: #5b667a;
          font-size: 14px;
        }

        .header-right {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .tag {
          padding: 8px 12px;
          border-radius: 999px;
          background: white;
          border: 1px solid #e3e8f2;
          font-size: 12px;
          color: #44506a;
          font-weight: 600;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        .card {
          background: white;
          border: 1px solid #e7ebf3;
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 4px 14px rgba(18, 38, 63, 0.04);
        }

        .kpi-label {
          font-size: 13px;
          color: #69758c;
          margin-bottom: 8px;
          font-weight: 600;
        }

        .kpi-value {
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .kpi-sub {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          font-size: 13px;
          color: #536079;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }

        .delta-pos {
          color: #0f8a43;
          background: #e9f8ef;
        }

        .delta-neg {
          color: #c23535;
          background: #fdecec;
        }

        .delta-neutral {
          color: #6b7280;
          background: #f3f4f6;
        }

        .section-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }

        .section-title {
          margin: 0 0 14px;
          font-size: 18px;
          font-weight: 800;
        }

        .table-wrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 980px;
        }

        th {
          text-align: left;
          font-size: 12px;
          color: #6b7280;
          font-weight: 700;
          padding: 12px 10px;
          border-bottom: 1px solid #edf1f7;
          white-space: nowrap;
          background: #fafbfd;
        }

        td {
          padding: 14px 10px;
          border-bottom: 1px solid #f1f4f9;
          font-size: 14px;
          vertical-align: middle;
        }

        tr:hover td {
          background: #fafcff;
        }

        .geo-cell {
          font-weight: 700;
          white-space: nowrap;
        }

        .num {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .muted {
          color: #738099;
        }

        .strong {
          font-weight: 800;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }

        .pill.scaling {
          background: #e9f8ef;
          color: #0f8a43;
        }

        .pill.reduced {
          background: #fff4e5;
          color: #b96b00;
        }

        .pill.paused {
          background: #fdecec;
          color: #c23535;
        }

        .pill.stable {
          background: #edf3ff;
          color: #2457c5;
        }

        .side-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .insight-item {
          border: 1px solid #eef2f7;
          border-radius: 14px;
          padding: 14px;
          background: #fbfcfe;
        }

        .insight-item h4 {
          margin: 0 0 6px;
          font-size: 14px;
        }

        .insight-item p {
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
          color: #5b667a;
        }

        .changes-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .mini-card-title {
          margin: 0 0 12px;
          font-size: 15px;
          font-weight: 800;
        }

        .mini-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .mini-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid #f0f3f8;
          font-size: 14px;
        }

        .mini-row:last-child {
          border-bottom: 0;
        }

        .reason {
          color: #6a768d;
          font-size: 12px;
          margin-top: 4px;
        }

        @media (max-width: 1200px) {
          .kpi-grid,
          .changes-grid,
          .section-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="header">
        <div className="header-left">
          <h1>MTD Performance Dashboard</h1>
          <p>
            MOP vs Live Plan vs Actual — fake sample layout for understanding the
            page structure
          </p>
        </div>

        <div className="header-right">
          <div className="tag">Month: {SUMMARY.month}</div>
          <div className="tag">Paused Geos: {computed.paused}</div>
          <div className="tag">Scaled Geos: {computed.scaled}</div>
          <div className="tag">Reduced Geos: {computed.reduced}</div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="kpi-grid">
        <div className="card">
          <div className="kpi-label">Spend</div>
          <div className="kpi-value">{fmtAED(computed.totals.actualSpend)}</div>
          <div className="kpi-sub">
            <span>MOP: {fmtAED(computed.totals.mopBudget)}</span>
            <span>Live: {fmtAED(computed.totals.liveBudget)}</span>
            <span className={`badge ${getDeltaClass(computed.spendVar)}`}>
              {varianceLabel(computed.totals.liveBudget, computed.totals.actualSpend)} vs Live
            </span>
          </div>
        </div>

        <div className="card">
          <div className="kpi-label">MQL</div>
          <div className="kpi-value">{fmtNum(computed.totals.actualMql)}</div>
          <div className="kpi-sub">
            <span>MOP: {fmtNum(computed.totals.mopMql)}</span>
            <span>Live: {fmtNum(computed.totals.liveMql)}</span>
            <span className={`badge ${getDeltaClass(computed.mqlVar)}`}>
              {varianceLabel(computed.totals.liveMql, computed.totals.actualMql)} vs Live
            </span>
          </div>
        </div>

        <div className="card">
          <div className="kpi-label">SQL</div>
          <div className="kpi-value">{fmtNum(computed.totals.actualSql)}</div>
          <div className="kpi-sub">
            <span>MOP: {fmtNum(computed.totals.mopSql)}</span>
            <span>Live: {fmtNum(computed.totals.liveSql)}</span>
            <span className={`badge ${getDeltaClass(computed.sqlVar)}`}>
              {varianceLabel(computed.totals.liveSql, computed.totals.actualSql)} vs Live
            </span>
          </div>
        </div>

        <div className="card">
          <div className="kpi-label">Pipeline</div>
          <div className="kpi-value">{fmtUSD(computed.totals.pipeline)}</div>
          <div className="kpi-sub">
            <span>Actual only</span>
            <span className="badge delta-neutral">
              Live decision view
            </span>
          </div>
        </div>
      </div>

      {/* MAIN TABLE + INSIGHTS */}
      <div className="section-grid">
        <div className="card">
          <h3 className="section-title">Geo Performance Overview</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Geo</th>
                  <th className="num">MOP Budget</th>
                  <th className="num">Live Budget</th>
                  <th className="num">Actual Spend</th>
                  <th className="num">Spend Var</th>
                  <th className="num">Live MQL</th>
                  <th className="num">Actual MQL</th>
                  <th className="num">Live SQL</th>
                  <th className="num">Actual SQL</th>
                  <th className="num">Pipeline</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {GEO_DATA.map((row) => {
                  const spendVar = pctDelta(row.liveBudget, row.actualSpend);
                  return (
                    <tr key={row.geo}>
                      <td className="geo-cell">
                        {row.flag} {row.geo}
                      </td>
                      <td className="num muted">{fmtAED(row.mopBudget)}</td>
                      <td className="num strong">{fmtAED(row.liveBudget)}</td>
                      <td className="num">{fmtAED(row.actualSpend)}</td>
                      <td className="num">
                        <span className={`badge ${getDeltaClass(spendVar)}`}>
                          {varianceLabel(row.liveBudget, row.actualSpend)}
                        </span>
                      </td>
                      <td className="num muted">{fmtNum(row.liveMql)}</td>
                      <td className="num">{fmtNum(row.actualMql)}</td>
                      <td className="num muted">{fmtNum(row.liveSql)}</td>
                      <td className="num">{fmtNum(row.actualSql)}</td>
                      <td className="num strong">{fmtUSD(row.pipeline)}</td>
                      <td>
                        <span className={getStatusClass(row.status)}>{row.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr>
                  <td className="geo-cell">Total</td>
                  <td className="num muted strong">{fmtAED(computed.totals.mopBudget)}</td>
                  <td className="num strong">{fmtAED(computed.totals.liveBudget)}</td>
                  <td className="num strong">{fmtAED(computed.totals.actualSpend)}</td>
                  <td className="num">
                    <span className={`badge ${getDeltaClass(computed.spendVar)}`}>
                      {varianceLabel(computed.totals.liveBudget, computed.totals.actualSpend)}
                    </span>
                  </td>
                  <td className="num muted strong">{fmtNum(computed.totals.liveMql)}</td>
                  <td className="num strong">{fmtNum(computed.totals.actualMql)}</td>
                  <td className="num muted strong">{fmtNum(computed.totals.liveSql)}</td>
                  <td className="num strong">{fmtNum(computed.totals.actualSql)}</td>
                  <td className="num strong">{fmtUSD(computed.totals.pipeline)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Live Insights</h3>
          <div className="side-list">
            <div className="insight-item">
              <h4>Best Efficiency Geo</h4>
              <p>
                {computed.bestGeo.flag} <strong>{computed.bestGeo.geo}</strong> is giving the
                strongest MQL efficiency based on current fake data.
              </p>
            </div>

            <div className="insight-item">
              <h4>Biggest Risk</h4>
              <p>
                {computed.riskGeo.flag} <strong>{computed.riskGeo.geo}</strong> is the biggest
                under-delivery risk vs live MQL plan right now.
              </p>
            </div>

            <div className="insight-item">
              <h4>Suggested Use Case</h4>
              <p>
                This page should help answer: where are we scaling, where are we
                cutting, and how are we tracking against the live operating plan.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PLAN CHANGES */}
      <div className="changes-grid">
        <div className="card">
          <h3 className="mini-card-title">Scaled / Increased</h3>
          <div className="mini-list">
            {GEO_DATA.filter((x) => x.status === "Scaling").map((row) => (
              <div className="mini-row" key={row.geo}>
                <div>
                  <div><strong>{row.flag} {row.geo}</strong></div>
                  <div className="reason">{row.reason}</div>
                </div>
                <div className="strong">
                  {fmtAED(row.mopBudget)} → {fmtAED(row.liveBudget)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="mini-card-title">Reduced</h3>
          <div className="mini-list">
            {GEO_DATA.filter((x) => x.status === "Reduced").map((row) => (
              <div className="mini-row" key={row.geo}>
                <div>
                  <div><strong>{row.flag} {row.geo}</strong></div>
                  <div className="reason">{row.reason}</div>
                </div>
                <div className="strong">
                  {fmtAED(row.mopBudget)} → {fmtAED(row.liveBudget)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="mini-card-title">Paused</h3>
          <div className="mini-list">
            {GEO_DATA.filter((x) => x.status === "Paused").map((row) => (
              <div className="mini-row" key={row.geo}>
                <div>
                  <div><strong>{row.flag} {row.geo}</strong></div>
                  <div className="reason">{row.reason}</div>
                </div>
                <div className="strong">
                  {fmtAED(row.mopBudget)} → {fmtAED(row.liveBudget)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
