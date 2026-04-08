import React, { useState, useMemo } from "react";
import leadsMasterData from "../data/processed/leads_master/master.json";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const QUARTER_MONTHS = {
  Q1: ["Jan", "Feb", "Mar"],
  Q2: ["Apr", "May", "Jun"],
  Q3: ["Jul", "Aug", "Sep"],
  Q4: ["Oct", "Nov", "Dec"],
};

const AVAILABLE_QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

const STAGE_COLORS = {
  "Closed Won": "won",
  "Sales Qualified": "sql",
  Opportunity: "opp",
  "Closed Lost": "lost",
};

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtUSD(value) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getMonthLabel(dateValue) {
  const d = parseDate(dateValue);
  if (!d) return null;
  return MONTHS[d.getUTCMonth()];
}

function isInSelection(dateValue, quarter, month) {
  const monthLabel = getMonthLabel(dateValue);
  if (!monthLabel) return false;

  if (month) return monthLabel === month;
  return (QUARTER_MONTHS[quarter] || []).includes(monthLabel);
}

function getSqlStage(row) {
  if (row?.closed_won === true) return "Closed Won";
  if (row?.deal_stage) return row.deal_stage;
  if (row?.sql === true) return "Sales Qualified";
  return "Sales Qualified";
}

function getCompany(row) {
  return (
    row.company ??
    row.company_name ??
    row.deal_name ??
    row.firstname ??
    row.first_name ??
    "—"
  );
}

function getCountry(row) {
  return row.country ?? row.geo ?? "Unknown";
}

function getGeo(row) {
  return row.country ?? row.geo ?? "Unknown";
}

function getCampaign(row) {
  return (
    row.campaign_name ??
    row.campaign ??
    row.hs_analytics_source_data_2 ??
    row.hs_analytics_source_data_1 ??
    row.new_lead_source ??
    "—"
  );
}

function getSqlDate(row) {
  return row.hs_v2_date_entered_salesqualifiedlead ?? null;
}

function getCreatedDate(row) {
  return row.createdate ?? row.created_time ?? row.lead_createdate ?? row.deal_createdate ?? null;
}

function getOwner(row) {
  return row.owner_name ?? row.hubspot_owner ?? row.deal_owner ?? "—";
}

function getHsUrl(row) {
  return row.deal_link || row.lead_link || "#";
}

function formatDateForDisplay(value) {
  const d = parseDate(value);
  if (!d) return "—";
  return d.toISOString().slice(0, 10);
}

function buildSqlRows(rows, quarter, month) {
  return (Array.isArray(rows) ? rows : [])
    .filter(
      (row) =>
        row?.sql === true &&
        isInSelection(getSqlDate(row), quarter, month)
    )
    .map((row, index) => ({
      id: row.deal_id || row.lead_id || `sql-row-${index}`,
      company: getCompany(row),
      country: getCountry(row),
      geo: getGeo(row),
      campaign: getCampaign(row),
      sqlDate: formatDateForDisplay(getSqlDate(row)),
      sqlDateRaw: parseDate(getSqlDate(row)),
      createdDate: formatDateForDisplay(getCreatedDate(row)),
      createdDateRaw: parseDate(getCreatedDate(row)),
      dealValue: safeNum(row.sql_amount_usd),
      stage: getSqlStage(row),
      owner: getOwner(row),
      hsUrl: getHsUrl(row),
    }));
}

function sortRows(rows, sortKey, sortDir) {
  const arr = [...rows];

  arr.sort((a, b) => {
    let aVal = a[sortKey];
    let bVal = b[sortKey];

    if (sortKey === "sqlDate") {
      aVal = a.sqlDateRaw ? a.sqlDateRaw.getTime() : 0;
      bVal = b.sqlDateRaw ? b.sqlDateRaw.getTime() : 0;
    }

    if (sortKey === "createdDate") {
      aVal = a.createdDateRaw ? a.createdDateRaw.getTime() : 0;
      bVal = b.createdDateRaw ? b.createdDateRaw.getTime() : 0;
    }

    if (typeof aVal === "string") aVal = aVal.toLowerCase();
    if (typeof bVal === "string") bVal = bVal.toLowerCase();

    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  return arr;
}

export default function SQL() {
  const [qFilter, setQFilter] = useState(AVAILABLE_QUARTERS[0] || "Q1");
  const [monthFilter, setMonthFilter] = useState(null);
  const [geoFilter, setGeoFilter] = useState(null);
  const [sortKey, setSortKey] = useState("sqlDate");
  const [sortDir, setSortDir] = useState("desc");

  const sqlRows = useMemo(() => {
    return buildSqlRows(leadsMasterData, qFilter, monthFilter);
  }, [qFilter, monthFilter]);

  const monthsInQuarter = useMemo(() => {
    const qMonths = QUARTER_MONTHS[qFilter] || [];
    return qMonths.filter((m) =>
      sqlRows.some((r) => getMonthLabel(r.sqlDate) === m)
    );
  }, [qFilter, sqlRows]);

  const handleQuarterClick = (q) => {
    setQFilter(q);
    setMonthFilter(null);
    setGeoFilter(null);
  };

  const handleMonthClick = (m) => {
    setMonthFilter((prev) => (prev === m ? null : m));
    setGeoFilter(null);
  };

  const filtered = useMemo(() => {
    if (!monthFilter) return sqlRows;
    return sqlRows.filter((row) => getMonthLabel(row.sqlDate) === monthFilter);
  }, [sqlRows, monthFilter]);

  const availableGeos = useMemo(() => {
    return [...new Set(filtered.map((r) => r.geo))].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [filtered]);

  const displayRows = useMemo(() => {
    const rows = geoFilter ? filtered.filter((r) => r.geo === geoFilter) : filtered;
    return sortRows(rows, sortKey, sortDir);
  }, [filtered, geoFilter, sortKey, sortDir]);

  const kpiSql = displayRows.length;
  const kpiPipeline = displayRows.reduce((s, r) => s + safeNum(r.dealValue), 0);
  const kpiAvg = kpiSql ? Math.round(kpiPipeline / kpiSql) : 0;
  const kpiWon = displayRows.filter((r) => r.stage === "Closed Won").length;

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortTh = ({ k, label }) => (
    <th onClick={() => handleSort(k)} className="sortable-th">
      {label} {sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : ""}
    </th>
  );

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">SQL Pipeline</h2>
      </div>

      <div className="filter-bar">
        {AVAILABLE_QUARTERS.map((q) => (
          <button
            key={q}
            className={`filter-pill ${qFilter === q && !monthFilter ? "active" : ""}`}
            onClick={() => handleQuarterClick(q)}
          >
            {q}
          </button>
        ))}

        {monthsInQuarter.length > 0 && <div className="filter-sep" />}

        {monthsInQuarter.map((m) => (
          <button
            key={m}
            className={`filter-pill ${monthFilter === m ? "active" : ""}`}
            onClick={() => handleMonthClick(m)}
          >
            {m}
          </button>
        ))}
      </div>

      {availableGeos.length > 0 && (
        <div className="filter-bar" style={{ marginTop: 8 }}>
          <span className="filter-label">Geo:</span>
          {availableGeos.map((g) => (
            <button
              key={g}
              className={`filter-pill ${geoFilter === g ? "active" : ""}`}
              onClick={() => setGeoFilter((prev) => (prev === g ? null : g))}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      <div className="kpi-grid kpi-grid-4">
        <div className="kpi-card">
          <span className="kpi-icon">🏆</span>
          <div className="kpi-label">SQLs</div>
          <div className="kpi-value">{kpiSql}</div>
        </div>

        <div className="kpi-card">
          <span className="kpi-icon">📊</span>
          <div className="kpi-label">Pipeline</div>
          <div className="kpi-value">{fmtUSD(kpiPipeline)}</div>
        </div>

        <div className="kpi-card">
          <span className="kpi-icon">💡</span>
          <div className="kpi-label">Avg Deal</div>
          <div className="kpi-value">{fmtUSD(kpiAvg)}</div>
        </div>

        <div className="kpi-card">
          <span className="kpi-icon">🔒</span>
          <div className="kpi-label">Closed Won</div>
          <div className="kpi-value">{kpiWon}</div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <SortTh k="company" label="Company" />
                <SortTh k="country" label="Country" />
                <SortTh k="geo" label="Geo" />
                <SortTh k="campaign" label="Campaign" />
                <SortTh k="sqlDate" label="SQL Date" />
                <SortTh k="createdDate" label="Created" />
                <SortTh k="dealValue" label="Deal Value" />
                <SortTh k="stage" label="Stage" />
                <SortTh k="owner" label="Owner" />
                <th>HubSpot</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.length > 0 ? (
                displayRows.map((row, i) => (
                  <tr key={row.id}>
                    <td className="dim">{i + 1}</td>
                    <td>{row.company}</td>
                    <td>
                      <span className="geo-tag">{row.country}</span>
                    </td>
                    <td>
                      <span className="geo-tag secondary">{row.geo}</span>
                    </td>
                    <td className="dim">{row.campaign}</td>
                    <td>{row.sqlDate}</td>
                    <td className="dim">{row.createdDate}</td>
                    <td className="num-cell accent">{fmtUSD(row.dealValue)}</td>
                    <td>
                      <span className={`stage-badge ${STAGE_COLORS[row.stage] || ""}`}>
                        {row.stage}
                      </span>
                    </td>
                    <td>{row.owner}</td>
                    <td>
                      <a className="hs-link" href={row.hsUrl} target="_blank" rel="noreferrer">
                        ↗ View
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="num-cell">
                    No SQL data found
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
