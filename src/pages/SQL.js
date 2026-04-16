import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "../lib/supabase";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const QUARTER_MONTHS = {
  Q1: ["Jan", "Feb", "Mar"],
  Q2: ["Apr", "May", "Jun"],
  Q3: ["Jul", "Aug", "Sep"],
  Q4: ["Oct", "Nov", "Dec"],
};

const AVAILABLE_QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const DISPLAY_YEAR = 2026;

const STAGE_COLORS = {
  "Closed Won": "won",
  "Sales Qualified": "sql",
  Opportunity: "opp",
  "Closed Lost": "lost",
  "Closed/Lost": "lost",
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

function getQuarterDateRange(quarter, month) {
  const quarterMonths = QUARTER_MONTHS[quarter] || [];
  const selectedMonths = month ? [month] : quarterMonths;

  const monthIndexes = selectedMonths
    .map((m) => MONTHS.indexOf(m))
    .filter((idx) => idx >= 0);

  if (monthIndexes.length === 0) {
    return { startIso: null, endIso: null };
  }

  const minMonth = Math.min(...monthIndexes);
  const maxMonth = Math.max(...monthIndexes);

  const start = new Date(Date.UTC(DISPLAY_YEAR, minMonth, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(DISPLAY_YEAR, maxMonth + 1, 0, 23, 59, 59, 999));

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function getSqlStage(row) {
  if (row?.deal_stage) return row.deal_stage;
  if (row?.is_closed_won === true) return "Closed Won";
  if (row?.is_sql === true) return "Sales Qualified";
  return "—";
}

function getCompany(row) {
  return row.company ?? row.deal_name ?? "—";
}

function getCountry(row) {
  return row.country ?? "Unknown";
}

function getGeo(row) {
  return row.country ?? "Unknown";
}

function getCampaign(row) {
  return (
    row.campaign_name ??
    row.utm_campaign ??
    row.hs_analytics_source_data_2 ??
    row.hs_analytics_source_data_1 ??
    "—"
  );
}

function getSqlDate(row) {
  return row.sql_date ?? null;
}

function getCreatedDate(row) {
  return row.lead_created_date ?? null;
}

function getOwner(row) {
  return row.owner_name ?? "—";
}

function getHsUrl(row) {
  return row.deal_link || row.lead_link || "#";
}

function formatDateForDisplay(value) {
  const d = parseDate(value);
  if (!d) return "—";
  return d.toISOString().slice(0, 10);
}

function buildSqlRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row, index) => ({
    id: row.deal_id || row.lead_id || `sql-row-${index}`,
    company: getCompany(row),
    country: getCountry(row),
    geo: getGeo(row),
    campaign: getCampaign(row),
    sqlDate: formatDateForDisplay(getSqlDate(row)),
    sqlDateRaw: parseDate(getSqlDate(row)),
    createdDate: formatDateForDisplay(getCreatedDate(row)),
    createdDateRaw: parseDate(getCreatedDate(row)),
    dealValue: safeNum(row.amount_usd),
    stage: getSqlStage(row),
    owner: getOwner(row),
    hsUrl: getHsUrl(row),
    isClosedWon: row.is_closed_won === true,
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

    if (sortKey === "dealValue") {
      aVal = safeNum(a.dealValue);
      bVal = safeNum(b.dealValue);
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
  const [qFilter, setQFilter] = useState("Q1");
  const [monthFilter, setMonthFilter] = useState(null);
  const [geoFilter, setGeoFilter] = useState(null);
  const [sortKey, setSortKey] = useState("sqlDate");
  const [sortDir, setSortDir] = useState("desc");
  const [supabaseRows, setSupabaseRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const monthsInQuarter = useMemo(() => {
    return QUARTER_MONTHS[qFilter] || [];
  }, [qFilter]);

  const handleQuarterClick = (q) => {
    setQFilter(q);
    setMonthFilter(null);
    setGeoFilter(null);
  };

  const handleMonthClick = (m) => {
    setMonthFilter((prev) => (prev === m ? null : m));
    setGeoFilter(null);
  };

  useEffect(() => {
    async function fetchSqlRows() {
      try {
        setLoading(true);

        const { startIso, endIso } = getQuarterDateRange(qFilter, monthFilter);
        if (!startIso || !endIso) {
          setSupabaseRows([]);
          return;
        }

        const { data, error } = await supabase
          .from("master_leads")
          .select(`
            lead_id,
            deal_id,
            company,
            country,
            campaign_name,
            utm_campaign,
            hs_analytics_source_data_1,
            hs_analytics_source_data_2,
            lead_created_date,
            is_sql,
            sql_date,
            is_closed_won,
            close_date,
            amount_usd,
            deal_stage,
            deal_name,
            owner_name,
            deal_link,
            lead_link
          `)
          .eq("is_sql", true)
          .gte("sql_date", startIso)
          .lte("sql_date", endIso);

        if (error) {
          console.error("SQL page fetch error:", error);
          setSupabaseRows([]);
        } else {
          setSupabaseRows(data || []);
        }
      } catch (err) {
        console.error("Unexpected SQL page fetch error:", err);
        setSupabaseRows([]);
      } finally {
        setLoading(false);
      }
    }

    fetchSqlRows();
  }, [qFilter, monthFilter]);

  const sqlRows = useMemo(() => {
    return buildSqlRows(supabaseRows);
  }, [supabaseRows]);

  const availableGeos = useMemo(() => {
    return [...new Set(sqlRows.map((r) => r.geo))].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [sqlRows]);

  const displayRows = useMemo(() => {
    const rows = geoFilter ? sqlRows.filter((r) => r.geo === geoFilter) : sqlRows;
    return sortRows(rows, sortKey, sortDir);
  }, [sqlRows, geoFilter, sortKey, sortDir]);

  const kpiSql = displayRows.length;
  const kpiPipeline = displayRows.reduce((s, r) => s + safeNum(r.dealValue), 0);
  const kpiAvg = kpiSql ? Math.round(kpiPipeline / kpiSql) : 0;
  const kpiWon = displayRows.filter((r) => r.isClosedWon).length;

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(
        key === "sqlDate" || key === "createdDate" || key === "dealValue"
          ? "desc"
          : "asc"
      );
    }
  };

  const SortTh = ({ k, label, className = "" }) => (
    <th onClick={() => handleSort(k)} className={`sortable-th ${className}`}>
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
                <th className="num-cell">#</th>
                <SortTh k="company" label="Company" />
                <SortTh k="country" label="Country" />
                <SortTh k="geo" label="Geo" />
                <SortTh k="campaign" label="Campaign" />
                <SortTh k="sqlDate" label="SQL Date" />
                <SortTh k="createdDate" label="Created" />
                <SortTh k="dealValue" label="Deal Value" className="num-cell" />
                <SortTh k="stage" label="Stage" />
                <SortTh k="owner" label="Owner" />
                <th>HubSpot</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.length > 0 ? (
                displayRows.map((row, i) => (
                  <tr key={row.id}>
                    <td className="num-cell dim">{i + 1}</td>
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
                    {loading ? "Loading..." : "No SQL data found"}
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
