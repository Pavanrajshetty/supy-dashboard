import React, { useState, useMemo } from "react";
import metaMasterData from "../data/processed/meta_master/meta_master.json";
import leadsMasterData from "../data/processed/leads_master/master.json";
import ISO_CODES from "../data/isocodes.json";

// ── Config ───────────────────────────────────────────────────
const RANGE_DAYS = {
  "7d": 7,
  "30d": 30,
  "60d": 60,
  "90d": 90,
};

const DATE_RANGES = [
  { v: "7d", l: "Last 7d" },
  { v: "30d", l: "Last 30d" },
  { v: "60d", l: "Last 60d" },
  { v: "90d", l: "Last 90d" },
];

const TREND_METRICS = [
  { key: "spend", label: "Spend", fmt: "aed" },
  { key: "mql", label: "MQL", fmt: "num" },
  { key: "sql", label: "SQL", fmt: "num" },
  { key: "pipeline", label: "Pipeline", fmt: "usd" },
  { key: "closure", label: "Closure", fmt: "usd" },
];

const DISPLAY_NAME_OVERRIDES = {
  "United Kingdom": "UK",
  "United Arab Emirates": "UAE",
  "United States": "USA",
};

// ── Helpers ──────────────────────────────────────────────────
function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtAED(value) {
  return `AED ${Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

function fmtUSD(value) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

function fmtNum(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
}

function fmtValue(value, type = "num") {
  if (type === "aed") return fmtAED(value);
  if (type === "usd") return fmtUSD(value);
  return fmtNum(value);
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toDayKey(value) {
  const d = parseDate(value);
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

function getDateRange(rangeKey) {
  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const days = RANGE_DAYS[rangeKey] ?? 30;
  const start = new Date(todayStart);
  start.setDate(start.getDate() - (days - 1));

  return { start, end: todayEnd };
}

function isWithinRange(dateValue, rangeKey) {
  const d = parseDate(dateValue);
  if (!d) return false;

  const { start, end } = getDateRange(rangeKey);
  return d >= start && d <= end;
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

function getAllGeos(metaRows, leadRows) {
  const metaGeos = (metaRows || []).map((row) => normalizeMetaCountry(getMetaCountry(row)));
  const leadGeos = (leadRows || []).map((row) => normalizeMasterCountry(row.country ?? row.geo));

  return [...new Set([...metaGeos, ...leadGeos])]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function buildTrendRows(metaRows, leadRows, rangeKey, selectedGeos) {
  const map = {};

  const ensureRow = (dateKey, geo) => {
    const key = `${dateKey}__${geo}`;
    if (!map[key]) {
      map[key] = {
        date: dateKey,
        geo,
        spend: 0,
        mql: 0,
        sql: 0,
        pipeline: 0,
        closure: 0,
      };
    }
    return map[key];
  };

  (metaRows || []).forEach((row) => {
    const rowDate = getMetaDate(row);
    if (!isWithinRange(rowDate, rangeKey)) return;

    const dateKey = toDayKey(rowDate);
    if (!dateKey) return;

    const geo = normalizeMetaCountry(getMetaCountry(row));
    if (!selectedGeos.includes(geo)) return;

    const bucket = ensureRow(dateKey, geo);
    bucket.spend += getMetaSpend(row);
    bucket.mql += getMetaLeads(row);
  });

  (leadRows || []).forEach((row) => {
    const geo = normalizeMasterCountry(row.country ?? row.geo);
    if (!selectedGeos.includes(geo)) return;

    if (row?.sql === true && isWithinRange(row?.hs_v2_date_entered_salesqualifiedlead, rangeKey)) {
      const dateKey = toDayKey(row?.hs_v2_date_entered_salesqualifiedlead);
      if (dateKey) {
        const bucket = ensureRow(dateKey, geo);
        bucket.sql += 1;
        bucket.pipeline += safeNum(row.sql_amount_usd);
      }
    }

    if (row?.closed_won === true && isWithinRange(row?.hs_v2_date_entered_51997770, rangeKey)) {
      const dateKey = toDayKey(row?.hs_v2_date_entered_51997770);
      if (dateKey) {
        const bucket = ensureRow(dateKey, geo);
        bucket.closure += safeNum(row.deal_amount_usd);
      }
    }
  });

  return Object.values(map).sort((a, b) => {
    if (a.date === b.date) return a.geo.localeCompare(b.geo);
    return new Date(a.date) - new Date(b.date);
  });
}

// ── Inline SVG line chart — keep same UI style ───────────────
function LineChart({ data, metricKey, metricFmt }) {
  const W = 800;
  const H = 160;
  const PAD = { top: 20, right: 16, bottom: 40, left: 8 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  if (!data.length) {
    return (
      <div
        style={{
          height: H,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#a099b5",
          fontSize: 14,
        }}
      >
        No data for selected filters
      </div>
    );
  }

  const vals = data.map((d) => safeNum(d[metricKey]));
  const maxVal = Math.max(...vals, 1);

  const xStep = innerW / Math.max(data.length - 1, 1);
  const yOf = (v) => PAD.top + innerH - (safeNum(v) / maxVal) * innerH;
  const xOf = (i) => PAD.left + (data.length === 1 ? innerW / 2 : i * xStep);

  const points = data.map((d, i) => `${xOf(i)},${yOf(d[metricKey] || 0)}`).join(" ");

  const fillPoints = [
    `${xOf(0)},${PAD.top + innerH}`,
    ...data.map((d, i) => `${xOf(i)},${yOf(d[metricKey] || 0)}`),
    `${xOf(data.length - 1)},${PAD.top + innerH}`,
  ].join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: H, overflow: "visible" }}
      aria-label="line chart"
    >
      <polygon points={fillPoints} fill="rgba(124,79,214,0.08)" />

      <polyline
        points={points}
        fill="none"
        stroke="#7c4fd6"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {data.map((d, i) => {
        const cx = xOf(i);
        const cy = yOf(d[metricKey] || 0);
        const val = d[metricKey] || 0;
        const lbl = `${d.date.slice(5)} ${d.geo}`;

        return (
          <g key={`${d.date}-${d.geo}-${i}`}>
            <circle cx={cx} cy={cy} r={4} fill="#7c4fd6" stroke="#ffffff" strokeWidth={2} />
            <circle cx={cx} cy={cy} r={14} fill="transparent">
              <title>{`${d.geo}: ${fmtValue(val, metricFmt)}`}</title>
            </circle>
            <text
              x={cx}
              y={PAD.top + innerH + 14}
              textAnchor="middle"
              fontSize="9"
              fill="#a099b5"
            >
              {lbl}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Page ─────────────────────────────────────────────────────
export default function Trends() {
  const [dateRange, setDateRange] = useState("30d");

  const allGeos = useMemo(() => {
    return getAllGeos(
      Array.isArray(metaMasterData) ? metaMasterData : [],
      Array.isArray(leadsMasterData) ? leadsMasterData : []
    );
  }, []);

  const [selectedGeos, setSelectedGeos] = useState(allGeos);
  const [selectedMetric, setSelectedMetric] = useState("mql");

  const toggleGeo = (geo) => {
    setSelectedGeos((prev) => {
      if (prev.includes(geo)) {
        const next = prev.filter((g) => g !== geo);
        return next.length ? next : [geo];
      }
      return [...prev, geo];
    });
  };

  const trendRows = useMemo(() => {
    return buildTrendRows(
      Array.isArray(metaMasterData) ? metaMasterData : [],
      Array.isArray(leadsMasterData) ? leadsMasterData : [],
      dateRange,
      selectedGeos
    );
  }, [dateRange, selectedGeos]);

  const metric = TREND_METRICS.find((m) => m.key === selectedMetric) || TREND_METRICS[0];

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">Trends</h2>
      </div>

      <div className="filter-bar">
        {DATE_RANGES.map((r) => (
          <button
            key={r.v}
            className={`filter-pill ${dateRange === r.v ? "active" : ""}`}
            onClick={() => setDateRange(r.v)}
          >
            {r.l}
          </button>
        ))}
      </div>

      <div className="filter-bar">
        {allGeos.map((geo) => (
          <button
            key={geo}
            className={`filter-pill ${selectedGeos.includes(geo) ? "active" : ""}`}
            onClick={() => toggleGeo(geo)}
          >
            {geo}
          </button>
        ))}
      </div>

      <div className="filter-bar" style={{ marginTop: 8 }}>
        {TREND_METRICS.map((m) => (
          <button
            key={m.key}
            className={`filter-pill ${selectedMetric === m.key ? "active" : ""}`}
            onClick={() => setSelectedMetric(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="card chart-placeholder">
        <h3 className="section-title">{metric.label} over time</h3>
        <LineChart
          data={trendRows}
          metricKey={selectedMetric}
          metricFmt={metric.fmt}
        />
      </div>

      <div className="card">
        <h3 className="section-title">Data Table</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Geo</th>
                {TREND_METRICS.map((m) => (
                  <th key={m.key}>{m.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trendRows.length > 0 ? (
                trendRows.map((row, i) => (
                  <tr key={`${row.date}-${row.geo}-${i}`}>
                    <td>{row.date}</td>
                    <td>
                      <span className="geo-tag">{row.geo}</span>
                    </td>
                    {TREND_METRICS.map((m) => (
                      <td key={m.key} className="num-cell">
                        {fmtValue(row[m.key], m.fmt)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2 + TREND_METRICS.length} className="num-cell">
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
