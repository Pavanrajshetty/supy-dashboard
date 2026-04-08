import React, { useMemo } from "react";
import metaMasterData from "../data/processed/meta_master/meta_master.json";

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtAED(value) {
  return `AED ${Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

function getMetaDate(row) {
  return (
    row.date ??
    row.created_time ??
    row.createdate ??
    row.created_date ??
    row.day ??
    row.report_date ??
    null
  );
}

function getMetaSpend(row) {
  return safeNum(
    row.spend_aed ??
      row.spendAED ??
      row.spend ??
      row.amount_spent_aed ??
      row.amount_spent ??
      row.cost ??
      0
  );
}

function getMetaLeads(row) {
  if (row.leads !== undefined && row.leads !== null && row.leads !== "") {
    return safeNum(row.leads);
  }

  if (row.mql !== undefined && row.mql !== null && row.mql !== "") {
    return safeNum(row.mql);
  }

  if (row.total_leads !== undefined && row.total_leads !== null && row.total_leads !== "") {
    return safeNum(row.total_leads);
  }

  return 0;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getMonthShortName(monthIndex) {
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
    monthIndex
  ];
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getWeekOfMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const monthStart = new Date(year, month, 1);
  monthStart.setHours(0, 0, 0, 0);

  const current = new Date(date);
  current.setHours(0, 0, 0, 0);

  const dayOfMonth = current.getDate();
  return Math.ceil(dayOfMonth / 7);
}

function buildWeekLabel(date) {
  return `${getMonthShortName(date.getMonth())}-W${getWeekOfMonth(date)}`;
}

function buildWeeklyRows(metaRows) {
  const weeklyMap = {};

  (metaRows || []).forEach((row) => {
    const rawDate = getMetaDate(row);
    const d = parseDate(rawDate);
    if (!d) return;

    const monthKey = getMonthKey(d);
    const weekNumber = getWeekOfMonth(d);
    const label = buildWeekLabel(d);
    const sortKey = `${monthKey}-W${weekNumber}`;

    if (!weeklyMap[sortKey]) {
      weeklyMap[sortKey] = {
        week: label,
        sortDate: new Date(d.getFullYear(), d.getMonth(), (weekNumber - 1) * 7 + 1),
        spend: 0,
        mql: 0,
      };
    }

    weeklyMap[sortKey].spend += getMetaSpend(row);
    weeklyMap[sortKey].mql += getMetaLeads(row);
  });

  const sortedWeeks = Object.values(weeklyMap).sort((a, b) => a.sortDate - b.sortDate);

  return sortedWeeks.map((week, index) => {
    const previousWeek = sortedWeeks[index - 1];

    const expected = previousWeek ? previousWeek.mql : 0;
    const achieved = week.mql;
    const diff = achieved - expected;

    const pct =
      expected > 0 ? Math.round((diff / expected) * 100) : achieved > 0 ? 100 : 0;

    return {
      week: week.week,
      spend: week.spend,
      mql: week.mql,
      expected,
      achieved,
      diff,
      pct,
      positive: diff >= 0,
    };
  });
}

function delta(expected, achieved) {
  const diff = safeNum(achieved) - safeNum(expected);
  const pct =
    safeNum(expected) > 0
      ? Math.round((diff / safeNum(expected)) * 100)
      : safeNum(achieved) > 0
      ? 100
      : 0;

  return {
    diff,
    pct,
    positive: diff >= 0,
  };
}

export default function WeekOnWeek() {
  const weeklyRows = useMemo(() => {
    return buildWeeklyRows(Array.isArray(metaMasterData) ? metaMasterData : []);
  }, []);

  const latestMonthLabel = useMemo(() => {
    if (!weeklyRows.length) return "No data";

    const last = weeklyRows[weeklyRows.length - 1]?.week || "";
    const monthLabel = last.split("-")[0];
    return `${monthLabel} ${new Date().getFullYear()}`;
  }, [weeklyRows]);

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">Week on Week</h2>
        <span className="page-sub">{latestMonthLabel}</span>
      </div>

      <div className="wow-grid">
        {weeklyRows.map((w) => {
          const d = delta(w.expected, w.achieved);

          return (
            <div className="card wow-card" key={w.week}>
              <div className="wow-week">{w.week}</div>

              <div className="wow-row">
                <span>Spend</span>
                <span className="num-cell">{fmtAED(w.spend)}</span>
              </div>

              <div className="wow-row">
                <span>MQL</span>
                <span className="num-cell">{w.mql}</span>
              </div>

              <div className="wow-divider" />

              <div className="wow-row">
                <span>Expected MQL</span>
                <span className="num-cell dim">{w.expected}</span>
              </div>

              <div className="wow-row">
                <span>Achieved MQL</span>
                <span className="num-cell">{w.achieved}</span>
              </div>

              <div className="wow-row">
                <span>Delta</span>
                <span className={`delta-badge ${d.positive ? "pos" : "neg"}`}>
                  {d.positive ? "+" : ""}
                  {d.diff} ({d.positive ? "+" : ""}
                  {d.pct}%)
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
              <tr>
                <th>Week</th>
                <th>Spend</th>
                <th>MQL</th>
                <th>Expected</th>
                <th>Achieved</th>
                <th>Delta</th>
                <th>Δ%</th>
              </tr>
            </thead>
            <tbody>
              {weeklyRows.length > 0 ? (
                weeklyRows.map((w) => {
                  const d = delta(w.expected, w.achieved);

                  return (
                    <tr key={w.week}>
                      <td>{w.week}</td>
                      <td className="num-cell">{fmtAED(w.spend)}</td>
                      <td className="num-cell">{w.mql}</td>
                      <td className="num-cell dim">{w.expected}</td>
                      <td className="num-cell">{w.achieved}</td>
                      <td className={`num-cell ${d.positive ? "pos-text" : "neg-text"}`}>
                        {d.positive ? "+" : ""}
                        {d.diff}
                      </td>
                      <td>
                        <span className={`delta-badge ${d.positive ? "pos" : "neg"}`}>
                          {d.positive ? "+" : ""}
                          {d.pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="num-cell">
                    No data found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
