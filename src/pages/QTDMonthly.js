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

function fmtAED(v) {
  return `AED ${Number(v || 0).toLocaleString()}`;
}
function fmtUSD(v) {
  return `$${Number(v || 0).toLocaleString()}`;
}
function fmt(v, type) {
  if (type === "aed") return fmtAED(v);
  if (type === "usd") return fmtUSD(v);
  return Number(v || 0).toLocaleString();
}

const safe = (v) => (v ? Number(v) : 0);

const getMonth = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt)) return null;
  return MONTHS[dt.getUTCMonth()];
};

const isInRange = (date, q, m) => {
  const mo = getMonth(date);
  if (!mo) return false;
  if (m) return mo === m;
  return QUARTER_MONTHS[q].includes(mo);
};

const normalizeMetaCountry = (raw) => {
  if (!raw) return "Unknown";
  const iso = ISO_CODES.meta_country_iso2_mapping?.[String(raw).toLowerCase()];
  const name = iso || raw;
  return DISPLAY_NAME_OVERRIDES[name] || name;
};

const normalizeMasterCountry = (raw) => {
  if (!raw) return "Unknown";
  const name = String(raw).trim();
  return DISPLAY_NAME_OVERRIDES[name] || name;
};

const aggregateMeta = (rows, q, m) => {
  const out = {};
  rows.forEach(r => {
    const date = r.created_time || r.createdate || r.date;
    if (!isInRange(date, q, m)) return;

    const geo = normalizeMetaCountry(r.country || r.country_code);
    const spend = safe(r.spend || r.amount_spent || r.cost);
    const mql = safe(r.leads || r.mql) || 1;

    if (!out[geo]) out[geo] = { spend: 0, mql: 0 };

    out[geo].spend += spend;
    out[geo].mql += mql;
  });
  return out;
};

const aggregateMaster = (rows, q, m) => {
  const out = {};
  rows.forEach(r => {
    const geo = normalizeMasterCountry(r.country);

    if (!out[geo]) out[geo] = { sql: 0, pipeline: 0 };

    if (isInRange(r.hs_v2_date_entered_salesqualifiedlead, q, m)) {
      out[geo].sql += 1;
      out[geo].pipeline += safe(r.sql_amount_usd);
    }
  });
  return out;
};

const buildRows = (meta, master) => {
  const geos = [...new Set([...Object.keys(meta), ...Object.keys(master)])];

  return geos.map(g => {
    const m = meta[g] || {};
    const s = master[g] || {};

    const spend = safe(m.spend);
    const mql = safe(m.mql);
    const sql = safe(s.sql);
    const pipeline = safe(s.pipeline);

    return {
      geo: g,
      spend,
      mql,
      cpl: mql ? spend / mql : 0,
      sql,
      cpsql: sql ? spend / sql : 0,
      pipeline,
    };
  });
};

export default function QTDMonthly() {
  const [quarter, setQuarter] = useState("Q1");
  const [month, setMonth] = useState(null);

  const geoRows = useMemo(() => {
    const m = aggregateMeta(metaData, quarter, month);
    const s = aggregateMaster(masterData, quarter, month);
    return buildRows(m, s);
  }, [quarter, month]);

  const kpis = useMemo(() => {
    return geoRows.reduce(
      (a, r) => ({
        spend: a.spend + r.spend,
        mql: a.mql + r.mql,
        sql: a.sql + r.sql,
        pipeline: a.pipeline + r.pipeline,
      }),
      { spend: 0, mql: 0, sql: 0, pipeline: 0 }
    );
  }, [geoRows]);

  const final = {
    spend: kpis.spend,
    mql: kpis.mql,
    cpl: kpis.mql ? kpis.spend / kpis.mql : 0,
    sql: kpis.sql,
    costPerSql: kpis.sql ? kpis.spend / kpis.sql : 0,
    pipeline: kpis.pipeline,
  };

  return (
    <div className="page">
      <h2>QTD / Monthly View</h2>

      <div className="filter-bar">
        {AVAILABLE_QUARTERS.map(q => (
          <button key={q} onClick={() => { setQuarter(q); setMonth(null); }}>
            {q}
          </button>
        ))}
        {QUARTER_MONTHS[quarter].map(m => (
          <button key={m} onClick={() => setMonth(month === m ? null : m)}>
            {m}
          </button>
        ))}
      </div>

      <div className="kpi-grid">
        {KPI_CARDS.map(c => (
          <div key={c.key}>
            <div>{c.label}</div>
            <div>{fmt(final[c.key], c.fmt)}</div>
          </div>
        ))}
      </div>

      <table>
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
          {geoRows.map(r => (
            <tr key={r.geo}>
              <td>{r.geo}</td>
              <td>{fmtAED(r.spend)}</td>
              <td>{r.mql}</td>
              <td>{fmtAED(r.cpl)}</td>
              <td>{r.sql}</td>
              <td>{fmtAED(r.cpsql)}</td>
              <td>{fmtUSD(r.pipeline)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
