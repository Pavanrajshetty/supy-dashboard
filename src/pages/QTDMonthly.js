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

function fmtMoney(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtUSD(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmt(value, type) {
  if (type === "money") return fmtMoney(value);
  if (type === "usd") return fmtUSD(value);
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function safeNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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

function getMetaLeads(row) {
  if (row.leads !== undefined && row.leads !== null && row.leads !== "") {
    return safeNumber(row.leads);
  }

  if (row.mql !== undefined && row.mql !== null && row.mql !== "") {
    return safeNumber(row.mql);
  }

  if (row.total_leads !== undefined && row.total_leads !== null && row.total_leads !== "") {
    return safeNumber(row.total_leads);
  }

  return 0;
}

function aggregateMeta(metaRows, quarter, month) {
  const byGeo = {};

  (metaRows || []).forEach((row) => {
    const rowDate = getMetaDate(row);
    if (!isInSelection(rowDate, quarter, month)) return;

    const geo = normalizeMetaCountry(getMetaCountry(row));
    const spend = getMetaSpend(row);
    const metaLeads = getMetaLeads(row);

    if (!byGeo[geo]) {
      byGeo[geo] = {
        geo,
        spend: 0,
        metaMql: 0,
      };
    }

    byGeo[geo].spend += spend;
    byGeo[geo].metaMql += metaLeads;
  });

  return byGeo;
}

function aggregateSupabase(masterRows, quarter, month) {
  const byGeo = {};

  (masterRows || []).forEach((row) => {
    const geo = normalizeMasterCountry(row.country);

    if (!byGeo[geo]) {
      byGeo[geo] = {
        geo,
        mql: 0,
        sql: 0,
        pipeline: 0,
        closures: 0,
        closure: 0,
      };
    }

    const isMql = isInSelection(row.lead_created_date, quarter, month);
    const isSql = row.is_sql === true && isInSelection(row.sql_date, quarter, month);
    const isClosedWon = row.is_closed_won === true && isInSelection(row.close_date, quarter, month);

    if (isMql) {
      byGeo[geo].mql += 1;
    }

    if (isSql) {
      byGeo[geo].sql += 1;
      byGeo[geo].pipeline += safeNumber(row.amount_usd);
    }

    if (isClosedWon) {
      byGeo[geo].closures += 1;
      byGeo[geo].closure += safeNumber(row.amount_usd);
    }
  });

  return byGeo;
}

function buildGeoRows(metaAgg, supabaseAgg) {
  const allGeos = Array.from(new Set([...Object.keys(metaAgg), ...Object.keys(supabaseAgg)]));

  return allGeos
    .map((geo) => {
      const meta = metaAgg[geo] || { spend: 0, metaMql: 0 };
      const supa = supabaseAgg[geo] || {
        mql: 0,
        sql: 0,
        pipeline: 0,
        closures: 0,
        closure: 0,
      };

      const spend = safeNumber(meta.spend);
      const mql = safeNumber(supa.mql);
      const sql = safeNumber(supa.sql);
      const pipeline = safeNumber(supa.pipeline);
      const closures = safeNumber(supa.closures);
      const closure = safeNumber(supa.closure);

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

export default function QTDMonthly() {
  const [quarter, setQuarter] = useState(AVAILABLE_QUARTERS[1] || "Q2");
  const [month, setMonth] = useState(null);
  const [supabaseRows, setSupabaseRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const monthsInQuarter = useMemo(() => {
    return QUARTER_MONTHS[quarter] || [];
  }, [quarter]);

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
          setSupabaseRows([]);
          return;
        }

        const { data, error } = await supabase
          .from("master_leads")
          .select(`
            lead_id,
            country,
            lead_created_date,
            is_sql,
            sql_date,
            is_closed_won,
            close_date,
            amount_usd
          `)
          .or(
            [
              `and(lead_created_date.gte.${startIso},lead_created_date.lte.${endIso})`,
              `and(is_sql.eq.true,sql_date.gte.${startIso},sql_date.lte.${endIso})`,
              `and(is_closed_won.eq.true,close_date.gte.${startIso},close_date.lte.${endIso})`,
            ].join(",")
          );

        if (error) {
          console.error("QTD supabase fetch error:", error);
          setSupabaseRows([]);
        } else {
          setSupabaseRows(data || []);
        }
      } catch (err) {
        console.error("Unexpected QTD fetch error:", err);
        setSupabaseRows([]);
      } finally {
        setLoading(false);
      }
    }

    fetchQTDData();
  }, [quarter, month]);

  const geoRows = useMemo(() => {
    const metaAgg = aggregateMeta(metaData || [], quarter, month);
    const supabaseAgg = aggregateSupabase(supabaseRows || [], quarter, month);
    return buildGeoRows(metaAgg, supabaseAgg);
  }, [quarter, month, supabaseRows]);

  const kpiSnapshot = useMemo(() => {
    return geoRows.reduce(
      (acc, row) => {
        acc.spend += row.spend.achieved;
        acc.mql += row.mql.achieved;
        acc.sql += row.sql.achieved;
        acc.pipeline += row.pipeline.achieved;
        acc.closures += row.closures.achieved;
        acc.closure += row.closure.achieved;
        return acc;
      },
      {
        spend: 0,
        mql: 0,
        sql: 0,
        pipeline: 0,
        closures: 0,
        closure: 0,
      }
    );
  }, [geoRows]);

  const finalKpis = useMemo(() => {
    return {
      spend: kpiSnapshot.spend,
      mql: kpiSnapshot.mql,
      cpl: kpiSnapshot.mql > 0 ? kpiSnapshot.spend / kpiSnapshot.mql : 0,
      sql: kpiSnapshot.sql,
      costPerSql: kpiSnapshot.sql > 0 ? kpiSnapshot.spend / kpiSnapshot.sql : 0,
      pipeline: kpiSnapshot.pipeline,
      closures: kpiSnapshot.closures,
      closure: kpiSnapshot.closure,
    };
  }, [kpiSnapshot]);

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
