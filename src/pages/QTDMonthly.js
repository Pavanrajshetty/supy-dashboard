import React, { useState, useMemo, useEffect } from "react";
import metaData from "../data/processed/meta_master/meta_master.json";
import ISO_CODES from "../data/isocodes.json";
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

function getMonthLabel(dateValue) {
  const d = parseDate(dateValue);
  if (!d) return null;
  return MONTHS[d.getUTCMonth()];
}

function getYear(dateValue) {
  const d = parseDate(dateValue);
  if (!d) return null;
  return d.getUTCFullYear();
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

function normalizeMetaCountry(raw) {
  if (!raw) return "Unknown";

  const isoMap = ISO_CODES?.meta_country_iso2_mapping || {};
  const code = String(raw).trim().toLowerCase();
  const mappedCountry = isoMap[code];

  if (typeof mappedCountry === "string" && mappedCountry.trim()) {
    return normalizeDisplayCountry(mappedCountry.trim());
  }

  if (mappedCountry && typeof mappedCountry === "object") {
    return normalizeDisplayCountry(mappedCountry.display || mappedCountry.name || raw);
  }

  return normalizeMasterCountry(raw);
}

function isInSelection(dateValue, quarter, month) {
  const monthLabel = getMonthLabel(dateValue);
  const year = getYear(dateValue);

  if (!monthLabel || year !== DISPLAY_YEAR) return false;
  if (month) return monthLabel === month;

  return (QUARTER_MONTHS[quarter] || []).includes(monthLabel);
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

function getMetaCountry(row) {
  return row.country ?? row.country_code ?? row.geo ?? row.region ?? null;
}

function getMetaSpend(row) {
  return safeNumber(
    row.spend_aed ??
      row.spendAED ??
      row.spend ??
      row.amount_spent_aed ??
      row.amount_spent ??
      row.cost ??
      0
  );
}

function getFilteredMetaRows(rows, quarter, month) {
  return (rows || []).filter((row) => {
    const rowDate = getMetaDate(row);
    return isInSelection(rowDate, quarter, month);
  });
}

function buildKpi(metaRows, leadsCount, sqlRows, closedWonRows) {
  const spend = (metaRows || []).reduce((sum, row) => sum + getMetaSpend(row), 0);
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

function aggregateMetaByGeo(rows, quarter, month) {
  const byGeo = {};

  (rows || []).forEach((row) => {
    const rowDate = getMetaDate(row);
    if (!isInSelection(rowDate, quarter, month)) return;

    const geo = normalizeMetaCountry(getMetaCountry(row));
    if (!byGeo[geo]) {
      byGeo[geo] = { spend: 0 };
    }

    byGeo[geo].spend += getMetaSpend(row);
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

export default function QTDMonthly() {
  const [quarter, setQuarter] = useState("Q1");
  const [month, setMonth] = useState(null);
  const [loading, setLoading] = useState(false);

  const [supabaseLeadsCount, setSupabaseLeadsCount] = useState(0);
  const [supabaseMqlRows, setSupabaseMqlRows] = useState([]);
  const [supabaseSqlRows, setSupabaseSqlRows] = useState([]);
  const [supabaseClosedWonRows, setSupabaseClosedWonRows] = useState([]);

  const monthsInQuarter = useMemo(() => QUARTER_MONTHS[quarter] || [], [quarter]);

  const filteredMetaRows = useMemo(() => {
    return getFilteredMetaRows(metaData || [], quarter, month);
  }, [quarter, month]);

  const handleQuarterClick = (q) => {
    setQuarter(q);
    setMonth(null);
  };

  useEffect(() => {
    async function fetchQTDData() {
      try {
        setLoading(true);

        const { startIso, endIso } = getQuarterDateRange(quarter, month);

        if (!startIso || !endIso) {
          setSupabaseLeadsCount(0);
          setSupabaseMqlRows([]);
          setSupabaseSqlRows([]);
          setSupabaseClosedWonRows([]);
          return;
        }

        const leadsCountPromise = supabase
          .from("master_leads")
          .select("lead_id", { count: "exact", head: true })
          .gte("lead_created_date", startIso)
          .lte("lead_created_date", endIso);

        const mqlRowsPromise = supabase
          .from("master_leads")
          .select(`
            lead_id,
            country,
            lead_created_date
          `)
          .gte("lead_created_date", startIso)
          .lte("lead_created_date", endIso);

        const sqlRowsPromise = supabase
          .from("master_leads")
          .select(`
            lead_id,
            deal_id,
            country,
            amount_usd,
            sql_date
          `)
          .eq("is_sql", true)
          .gte("sql_date", startIso)
          .lte("sql_date", endIso);

        const closedWonRowsPromise = supabase
          .from("master_leads")
          .select(`
            lead_id,
            deal_id,
            country,
            amount_usd,
            close_date
          `)
          .eq("is_closed_won", true)
          .gte("close_date", startIso)
          .lte("close_date", endIso);

        const [
          leadsCountResponse,
          mqlRowsResponse,
          sqlRowsResponse,
          closedWonRowsResponse,
        ] = await Promise.all([
          leadsCountPromise,
          mqlRowsPromise,
          sqlRowsPromise,
          closedWonRowsPromise,
        ]);

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
      filteredMetaRows,
      supabaseLeadsCount,
      supabaseSqlRows,
      supabaseClosedWonRows
    );
  }, [filteredMetaRows, supabaseLeadsCount, supabaseSqlRows, supabaseClosedWonRows]);

  const geoRows = useMemo(() => {
    const metaAgg = aggregateMetaByGeo(metaData || [], quarter, month);
    const mqlAgg = aggregateMqlByGeo(supabaseMqlRows || []);
    const sqlAgg = aggregateSqlByGeo(supabaseSqlRows || []);
    const closedAgg = aggregateClosedByGeo(supabaseClosedWonRows || []);

    return buildGeoRows(metaAgg, mqlAgg, sqlAgg, closedAgg);
  }, [quarter, month, supabaseMqlRows, supabaseSqlRows, supabaseClosedWonRows]);

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
                <th>Geo</th>
                <th className="num-cell">Spend</th>
                <th className="num-cell">MQL</th>
                <th className="num-cell">CPL</th>
                <th className="num-cell">SQL</th>
                <th className="num-cell">CPSQL</th>
                <th className="num-cell">Pipeline</th>
                <th className="num-cell">Closures</th>
                <th className="num-cell">Closure</th>
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
