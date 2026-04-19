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

const KPI_CARDS = [
  { key: "spend", label: "SPEND", icon: "💸", fmt: "money" },
  { key: "mql", label: "MQL", icon: "📥", fmt: "int" },
  { key: "cpl", label: "CPL", icon: "🧮", fmt: "money" },
  { key: "sql", label: "SQL", icon: "🏆", fmt: "int" },
  { key: "costPerSql", label: "COST / SQL", icon: "↘️", fmt: "money" },
  { key: "pipeline", label: "PIPELINE", icon: "📊", fmt: "usd" },
  { key: "closures", label: "CLOSURES", icon: "🔐", fmt: "int" },
  { key: "closure", label: "CLOSURE", icon: "🔒", fmt: "usd" },
];

const DISPLAY_NAME_OVERRIDES = {
  "United Kingdom": "UK",
  "United Arab Emirates": "UAE",
  "United States": "USA",
};

function safeNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(value) {
  return `$${Math.round(Number(value || 0)).toLocaleString()}`;
}

function fmtUSD(value) {
  return `$${Math.round(Number(value || 0)).toLocaleString()}`;
}

function fmt(value, type) {
  if (type === "money") return fmtMoney(value);
  if (type === "usd") return fmtUSD(value);
  return Math.round(Number(value || 0)).toLocaleString();
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeDisplayCountry(name) {
  if (!name) return "Unknown";
  const clean = String(name).trim();
  return DISPLAY_NAME_OVERRIDES[clean] || clean;
}

function normalizeMasterCountry(raw) {
  if (!raw) return "Unknown";
  return normalizeDisplayCountry(String(raw).trim());
}

function getQuarterDateRange(quarter, month) {
  const quarterMonths = QUARTER_MONTHS[quarter] || [];
  const selectedMonths = month ? [month] : quarterMonths;

  const monthIndexes = selectedMonths
    .map((m) => MONTHS.indexOf(m))
    .filter((idx) => idx >= 0);

  if (monthIndexes.length === 0) {
    return { startIso: null, endIso: null, startDate: null, endDate: null };
  }

  const minMonth = Math.min(...monthIndexes);
  const maxMonth = Math.max(...monthIndexes);

  const start = new Date(Date.UTC(DISPLAY_YEAR, minMonth, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(DISPLAY_YEAR, maxMonth + 1, 0, 23, 59, 59, 999));

  // date-only strings for perf_date comparison (same as ExecutiveSummary pattern)
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    startDate,
    endDate,
  };
}

function buildKpi(metaRows, leadsCount, sqlRows, closedWonRows) {
  // spend from supabase meta_performance rows (spend_usd field)
  const spend = (metaRows || []).reduce((sum, row) => sum + safeNumber(row.spend_usd), 0);
  const mql = safeNumber(leadsCount);
  const sql = (sqlRows || []).length;
  const pipeline = (sqlRows || []).reduce((sum, row) => sum + safeNumber(row.amount_usd), 0);
  const closures = (closedWonRows || []).length;
  const closure = (closedWonRows || []).reduce((sum, row) => sum + safeNumber(row.amount_usd), 0);

  return {
    spend,
    mql,
    cpl: mql > 0 ? spend / mql : 0,
    sql,
    costPerSql: sql > 0 ? spend / sql : 0,
    pipeline,
    closures,
    closure,
  };
}

function buildGeoRows(metaAgg, mqlAgg, sqlAgg, closedAgg) {
  const allGeos = Array.from(
    new Set([
      ...Object.keys(metaAgg),
      ...Object.keys(mqlAgg),
      ...Object.keys(sqlAgg),
      ...Object.keys(closedAgg),
    ])
  );

  return allGeos
    .map((geo) => {
      const spend = safeNumber(metaAgg[geo]?.spend);
      const mql = safeNumber(mqlAgg[geo]?.mql);
      const sql = safeNumber(sqlAgg[geo]?.sql);
      const pipeline = safeNumber(sqlAgg[geo]?.pipeline);
      const closures = safeNumber(closedAgg[geo]?.closures);
      const closure = safeNumber(closedAgg[geo]?.closure);

      return {
        geo,
        spend: { achieved: spend },
        mql: { achieved: mql },
        costPerMql: { achieved: mql > 0 ? spend / mql : 0 },
        sql: { achieved: sql },
        costPerSql: { achieved: sql > 0 ? spend / sql : 0 },
        pipeline: { achieved: pipeline },
        closures: { achieved: closures },
        closure: { achieved: closure },
      };
    })
    .sort((a, b) => b.spend.achieved - a.spend.achieved);
}

// Uses country_name from meta_performance (already a full name, no ISO mapping needed)
function aggregateMetaByGeo(rows) {
  const byGeo = {};

  (rows || []).forEach((row) => {
    const geo = normalizeMasterCountry(row.country_name);
    if (!byGeo[geo]) {
      byGeo[geo] = { spend: 0 };
    }
    byGeo[geo].spend += safeNumber(row.spend_usd);
  });

  return byGeo;
}

function aggregateMqlByGeo(rows) {
  const byGeo = {};

  (rows || []).forEach((row) => {
    const geo = normalizeMasterCountry(row.country);
    if (!byGeo[geo]) {
      byGeo[geo] = { mql: 0 };
    }
    byGeo[geo].mql += 1;
  });

  return byGeo;
}

function aggregateSqlByGeo(rows) {
  const byGeo = {};

  (rows || []).forEach((row) => {
    const geo = normalizeMasterCountry(row.country);
    if (!byGeo[geo]) {
      byGeo[geo] = { sql: 0, pipeline: 0 };
    }
    byGeo[geo].sql += 1;
    byGeo[geo].pipeline += safeNumber(row.amount_usd);
  });

  return byGeo;
}

function aggregateClosedByGeo(rows) {
  const byGeo = {};

  (rows || []).forEach((row) => {
    const geo = normalizeMasterCountry(row.country);
    if (!byGeo[geo]) {
      byGeo[geo] = { closures: 0, closure: 0 };
    }
    byGeo[geo].closures += 1;
    byGeo[geo].closure += safeNumber(row.amount_usd);
  });

  return byGeo;
}

function sortRows(rows, sortKey, sortDir) {
  const arr = [...rows];

  arr.sort((a, b) => {
    let aVal = sortKey === "geo" ? a.geo : a[sortKey]?.achieved || 0;
    let bVal = sortKey === "geo" ? b.geo : b[sortKey]?.achieved || 0;

    if (typeof aVal === "string") aVal = aVal.toLowerCase();
    if (typeof bVal === "string") bVal = bVal.toLowerCase();

    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  return arr;
}

async function fetchAllRows(buildQuery, pageSize = 1000) {
  let allRows = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await buildQuery().range(from, to);
    if (error) throw error;
    const rows = data || [];
    allRows = allRows.concat(rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

export default function QTDMonthly() {
  const [quarter, setQuarter] = useState("Q1");
  const [month, setMonth] = useState(null);
  const [loading, setLoading] = useState(false);

  // ── All data now from Supabase ────────────────────────────
  const [supabaseMetaRows, setSupabaseMetaRows] = useState([]);
  const [supabaseLeadsCount, setSupabaseLeadsCount] = useState(0);
  const [supabaseMqlRows, setSupabaseMqlRows] = useState([]);
  const [supabaseSqlRows, setSupabaseSqlRows] = useState([]);
  const [supabaseClosedWonRows, setSupabaseClosedWonRows] = useState([]);

  const [sortKey, setSortKey] = useState("spend");
  const [sortDir, setSortDir] = useState("desc");

  const monthsInQuarter = useMemo(() => QUARTER_MONTHS[quarter] || [], [quarter]);

  const handleQuarterClick = (q) => {
    setQuarter(q);
    setMonth(null);
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "geo" ? "asc" : "desc");
    }
  };

  const SortTh = ({ k, label, className = "" }) => (
    <th onClick={() => handleSort(k)} className={`sortable-th ${className}`}>
      {label} {sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : ""}
    </th>
  );

  useEffect(() => {
    async function fetchQTDData() {
      try {
        setLoading(true);

        const { startIso, endIso, startDate, endDate } = getQuarterDateRange(quarter, month);

        if (!startIso || !endIso) {
          setSupabaseMetaRows([]);
          setSupabaseLeadsCount(0);
          setSupabaseMqlRows([]);
          setSupabaseSqlRows([]);
          setSupabaseClosedWonRows([]);
          return;
        }

        const [
          metaRows,
          leadsCountResponse,
          mqlRowsResponse,
          sqlRowsResponse,
          closedWonRowsResponse,
        ] = await Promise.all([
          // ── REPLACED: was meta_master.json, now live from Supabase ──
          fetchAllRows(() =>
            supabase
              .from("meta_performance")
              .select("perf_date, spend_usd, country_name")
              .eq("level", "ad")
              .gte("perf_date", startDate)
              .lte("perf_date", endDate)
          ),

          // MQL count
          supabase
            .from("master_leads")
            .select("lead_id", { count: "exact", head: true })
            .gte("lead_created_date", startIso)
            .lte("lead_created_date", endIso),

          // MQL rows for geo breakdown
          supabase
            .from("master_leads")
            .select("lead_id, country, lead_created_date")
            .gte("lead_created_date", startIso)
            .lte("lead_created_date", endIso),

          // SQL rows
          supabase
            .from("master_leads")
            .select("lead_id, deal_id, country, amount_usd, sql_date")
            .eq("is_sql", true)
            .gte("sql_date", startIso)
            .lte("sql_date", endIso),

          // Closed Won rows
          supabase
            .from("master_leads")
            .select("lead_id, deal_id, country, amount_usd, close_date")
            .eq("is_closed_won", true)
            .gte("close_date", startIso)
            .lte("close_date", endIso),
        ]);

        setSupabaseMetaRows(metaRows || []);

        if (leadsCountResponse.error) {
          console.error("QTD leads count error:", leadsCountResponse.error);
          setSupabaseLeadsCount(0);
        } else {
          setSupabaseLeadsCount(leadsCountResponse.count || 0);
        }

        if (mqlRowsResponse.error) {
          console.error("QTD MQL rows error:", mqlRowsResponse.error);
          setSupabaseMqlRows([]);
        } else {
          setSupabaseMqlRows(mqlRowsResponse.data || []);
        }

        if (sqlRowsResponse.error) {
          console.error("QTD SQL rows error:", sqlRowsResponse.error);
          setSupabaseSqlRows([]);
        } else {
          setSupabaseSqlRows(sqlRowsResponse.data || []);
        }

        if (closedWonRowsResponse.error) {
          console.error("QTD closed won rows error:", closedWonRowsResponse.error);
          setSupabaseClosedWonRows([]);
        } else {
          setSupabaseClosedWonRows(closedWonRowsResponse.data || []);
        }
      } catch (err) {
        console.error("Unexpected QTD fetch error:", err);
        setSupabaseMetaRows([]);
        setSupabaseLeadsCount(0);
        setSupabaseMqlRows([]);
        setSupabaseSqlRows([]);
        setSupabaseClosedWonRows([]);
      } finally {
        setLoading(false);
      }
    }

    fetchQTDData();
  }, [quarter, month]);

  const finalKpis = useMemo(() => {
    return buildKpi(
      supabaseMetaRows,
      supabaseLeadsCount,
      supabaseSqlRows,
      supabaseClosedWonRows
    );
  }, [supabaseMetaRows, supabaseLeadsCount, supabaseSqlRows, supabaseClosedWonRows]);

  const geoRows = useMemo(() => {
    const metaAgg = aggregateMetaByGeo(supabaseMetaRows);
    const mqlAgg = aggregateMqlByGeo(supabaseMqlRows || []);
    const sqlAgg = aggregateSqlByGeo(supabaseSqlRows || []);
    const closedAgg = aggregateClosedByGeo(supabaseClosedWonRows || []);

    return sortRows(
      buildGeoRows(metaAgg, mqlAgg, sqlAgg, closedAgg),
      sortKey,
      sortDir
    );
  }, [supabaseMetaRows, supabaseMqlRows, supabaseSqlRows, supabaseClosedWonRows, sortKey, sortDir]);

  const ctxLabel = month
    ? `${quarter} · ${month} ${DISPLAY_YEAR}`
    : `${quarter} · All months (${monthsInQuarter.join(", ")}) ${DISPLAY_YEAR}`;

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">QTD / Monthly View</h2>
      </div>

      <div className="filter-bar">
        {AVAILABLE_QUARTERS.map((q) => (
          <button
            key={q}
            className={`filter-pill ${quarter === q ? "active" : ""}`}
            onClick={() => handleQuarterClick(q)}
          >
            {q}
          </button>
        ))}

        {monthsInQuarter.length > 0 && <div className="filter-sep" />}

        {monthsInQuarter.map((m) => (
          <button
            key={m}
            className={`filter-pill ${month === m ? "active" : ""}`}
            onClick={() => setMonth((prev) => (prev === m ? null : m))}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="ctx-label">Showing: {ctxLabel}</div>

      <div className="kpi-grid">
        {KPI_CARDS.map((c) => (
          <div className="kpi-card" key={c.key}>
            <span className="kpi-icon">{c.icon}</span>
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-value">{fmt(finalKpis[c.key], c.fmt)}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="section-title">
          Geo Breakdown — {month ? `${month} ${quarter}` : `All of ${quarter}`}
        </h3>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <SortTh k="geo" label="Geo" />
                <SortTh k="spend" label="Spend" className="num-cell" />
                <SortTh k="mql" label="MQL" className="num-cell" />
                <SortTh k="costPerMql" label="CPL" className="num-cell" />
                <SortTh k="sql" label="SQL" className="num-cell" />
                <SortTh k="costPerSql" label="CPSQL" className="num-cell" />
                <SortTh k="pipeline" label="Pipeline" className="num-cell" />
                <SortTh k="closures" label="Closures" className="num-cell" />
                <SortTh k="closure" label="Closure" className="num-cell" />
              </tr>
            </thead>
            <tbody>
              {geoRows.map((row) => (
                <tr key={row.geo}>
                  <td>{row.geo}</td>
                  <td className="num-cell">{fmtMoney(row.spend.achieved)}</td>
                  <td className="num-cell">{row.mql.achieved.toLocaleString()}</td>
                  <td className="num-cell">{fmtMoney(row.costPerMql.achieved)}</td>
                  <td className="num-cell">{row.sql.achieved.toLocaleString()}</td>
                  <td className="num-cell">{fmtMoney(row.costPerSql.achieved)}</td>
                  <td className="num-cell accent">{fmtUSD(row.pipeline.achieved)}</td>
                  <td className="num-cell">{row.closures.achieved.toLocaleString()}</td>
                  <td className="num-cell accent">{fmtUSD(row.closure.achieved)}</td>
                </tr>
              ))}

              {geoRows.length === 0 && (
                <tr>
                  <td colSpan="9" className="num-cell">
                    {loading ? "Loading..." : "No data found"}
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
