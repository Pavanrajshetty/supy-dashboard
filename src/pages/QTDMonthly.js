import React, { useState, useMemo } from "react";
import masterData from "../data/processed/leads_master/master.json";
import metaData from "../data/processed/meta_master/meta_master.json";
import ISO_CODES from "../data/isocodes.json";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const QUARTER_MONTHS = {
  Q1: ["Jan", "Feb", "Mar"],
  Q2: ["Apr", "May", "Jun"],
  Q3: ["Jul", "Aug", "Sep"],
  Q4: ["Oct", "Nov", "Dec"],
};

const AVAILABLE_QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

const KPI_CARDS = [
  { key: "spend", label: "SPEND", icon: "💸", fmt: "aed" },
  { key: "mql", label: "MQL", icon: "📥", fmt: "int" },
  { key: "cpl", label: "CPL", icon: "🧮", fmt: "aed" },
  { key: "sql", label: "SQL", icon: "🏆", fmt: "int" },
  { key: "costPerSql", label: "COST / SQL", icon: "↘️", fmt: "aed" },
  { key: "pipeline", label: "PIPELINE", icon: "📊", fmt: "usd" },
];

const DISPLAY_NAME_OVERRIDES = {
  "United Kingdom": "UK",
  "United Arab Emirates": "UAE",
  "United States": "USA",
};

function fmtAED(value) {
  return `AED ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtUSD(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmt(value, type) {
  if (type === "aed") return fmtAED(value);
  if (type === "usd") return fmtUSD(value);
  return Number(value || 0).toLocaleString();
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
  if (!monthLabel) return false;

  if (month) return monthLabel === month;
  return (QUARTER_MONTHS[quarter] || []).includes(monthLabel);
}

function getMetaDate(row) {
  return (
    row.created_time ??
    row.createdate ??
    row.created_date ??
    row.date ??
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

  return 1;
}

function aggregateMeta(metaRows, quarter, month) {
  const byGeo = {};

  (metaRows || []).forEach((row) => {
    const rowDate = getMetaDate(row);
    if (!isInSelection(rowDate, quarter, month)) return;

    const geo = normalizeMetaCountry(getMetaCountry(row));
    const spend = getMetaSpend(row);
    const mql = getMetaLeads(row);

    if (!byGeo[geo]) {
      byGeo[geo] = {
        geo,
        spend: 0,
        mql: 0,
      };
    }

    byGeo[geo].spend += spend;
    byGeo[geo].mql += mql;
  });

  return byGeo;
}

function aggregateMaster(masterRows, quarter, month) {
  const byGeo = {};

  (masterRows || []).forEach((row) => {
    const geo = normalizeMasterCountry(row.country ?? row.geo);

    if (!byGeo[geo]) {
      byGeo[geo] = {
        geo,
        sql: 0,
        pipeline: 0,
        closures: 0,
        revenue: 0,
      };
    }

    if (isInSelection(row.hs_v2_date_entered_salesqualifiedlead, quarter, month)) {
      byGeo[geo].sql += 1;
      byGeo[geo].pipeline += safeNumber(row.sql_amount_usd);
    }

    if (isInSelection(row.hs_v2_date_entered_51997770, quarter, month)) {
      byGeo[geo].closures += 1;
      byGeo[geo].revenue += safeNumber(row.deal_amount_usd);
    }
  });

  return byGeo;
}

function buildGeoRows(metaAgg, masterAgg) {
  const allGeos = Array.from(new Set([...Object.keys(metaAgg), ...Object.keys(masterAgg)]));

  return allGeos
    .map((geo) => {
      const meta = metaAgg[geo] || { spend: 0, mql: 0 };
      const master = masterAgg[geo] || { sql: 0, pipeline: 0, closures: 0, revenue: 0 };

      const spend = safeNumber(meta.spend);
      const mql = safeNumber(meta.mql);
      const sql = safeNumber(master.sql);
      const pipeline = safeNumber(master.pipeline);

      return {
        geo,
        spend: { achieved: spend },
        mql: { achieved: mql },
        costPerMql: { achieved: mql > 0 ? spend / mql : 0 },
        sql: { achieved: sql },
        costPerSql: { achieved: sql > 0 ? spend / sql : 0 },
        pipeline: { achieved: pipeline },
        closures: { achieved: safeNumber(master.closures) },
        revenue: { achieved: safeNumber(master.revenue) },
      };
    })
    .sort((a, b) => b.spend.achieved - a.spend.achieved);
}

export default function QTDMonthly() {
  const [quarter, setQuarter] = useState(AVAILABLE_QUARTERS[0] || "Q1");
  const [month, setMonth] = useState(null);

  const monthsInQuarter = useMemo(() => {
    return QUARTER_MONTHS[quarter] || [];
  }, [quarter]);

  const handleQuarterClick = (q) => {
    setQuarter(q);
    setMonth(null);
  };

  const geoRows = useMemo(() => {
    const metaAgg = aggregateMeta(metaData || [], quarter, month);
    const masterAgg = aggregateMaster(masterData || [], quarter, month);
    return buildGeoRows(metaAgg, masterAgg);
  }, [quarter, month]);

  const kpiSnapshot = useMemo(() => {
    return geoRows.reduce(
      (acc, row) => {
        acc.spend += row.spend.achieved;
        acc.mql += row.mql.achieved;
        acc.sql += row.sql.achieved;
        acc.pipeline += row.pipeline.achieved;
        acc.closures += row.closures.achieved;
        acc.revenue += row.revenue.achieved;
        return acc;
      },
      {
        spend: 0,
        mql: 0,
        sql: 0,
        pipeline: 0,
        closures: 0,
        revenue: 0,
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
    };
  }, [kpiSnapshot]);

  const ctxLabel = month
    ? `${quarter} · ${month} 2026`
    : `${quarter} · All months (${monthsInQuarter.join(", ")}) 2026`;

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
                <th>Spend</th>
                <th>MQL</th>
                <th>CPL</th>
                <th>SQL</th>
                <th>CPSQL</th>
                <th>Pipeline</th>
              </tr>
            </thead>
            <tbody>
              {geoRows.map((row) => (
                <tr key={row.geo}>
                  <td>{row.geo}</td>
                  <td className="num-cell">{fmtAED(row.spend.achieved)}</td>
                  <td className="num-cell">{row.mql.achieved}</td>
                  <td className="num-cell">{fmtAED(row.costPerMql.achieved)}</td>
                  <td className="num-cell">{row.sql.achieved}</td>
                  <td className="num-cell">{fmtAED(row.costPerSql.achieved)}</td>
                  <td className="num-cell accent">{fmtUSD(row.pipeline.achieved)}</td>
                </tr>
              ))}

              {geoRows.length === 0 && (
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
