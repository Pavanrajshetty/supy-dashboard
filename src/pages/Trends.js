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
  { key: "spend", label: "Spend", fmt: "money" },
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

function fmtMoney(value) {
  return `$${Number(value || 0).toLocaleString(undefined, {
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
  if (type === "money") return fmtMoney(value);
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

function formatShortDate(value) {
  const d = parseDate(value);
  if (!d) return value;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
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

function getRangeDateKeys(rangeKey) {
  const { start, end } = getDateRange(rangeKey);
  const out = [];
  const d = new Date(start);

  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }

  return out;
}

function buildTrendRows(metaRows, leadRows, rangeKey, selectedGeos) {
  const allDates = getRangeDateKeys(rangeKey);
  const byDate = {};

  allDates.forEach((dateKey) => {
    byDate[dateKey] = {
      date: dateKey,
      spend: 0,
      mql: 0,
      sql: 0,
      pipeline: 0,
      closure: 0,
    };
  });

  (metaRows || []).forEach((row) => {
    const rowDate = getMetaDate(row);
    if (!isWithinRange(rowDate, rangeKey)) return;

    const dateKey = toDayKey(rowDate);
    if (!dateKey || !byDate[dateKey]) return;

    const geo = normalizeMetaCountry(getMetaCountry(row));
    if (!selectedGeos.includes(geo)) return;

    byDate[dateKey].spend += getMetaSpend(row);
    byDate[dateKey].mql += getMetaLeads(row);
  });

  (leadRows || []).forEach((row) => {
    const geo = normalizeMasterCountry(row.country ?? row.geo);
    if (!selectedGeos.includes(geo)) return;

    const sqlDate =
      isWithinRange(row?.hs_v2_date_entered_salesqualifiedlead, rangeKey)
        ? row?.hs_v2_date_entered_salesqualifiedlead
        : isWithinRange(row?.deal_createdate, rangeKey)
        ? row?.deal_createdate
        : null;

    if (row?.sql === true && sqlDate) {
      const dateKey = toDayKey(sqlDate);
      if (dateKey && byDate[dateKey]) {
        byDate[dateKey].sql += 1;
        byDate[dateKey].pipeline += safeNum(row.sql_amount_usd);
      }
    }

    if (row?.closed_won === true && isWithinRange(row?.hs_v2_date_entered_51997770, rangeKey)) {
      const dateKey = toDayKey(row?.hs_v2_date_entered_51997770);
      if (dateKey && byDate[dateKey]) {
        byDate[dateKey].closure += safeNum(row.deal_amount_usd);
      }
    }
  });

  return allDates.map((dateKey) => byDate[dateKey]);
}

function getNiceMax(maxVal) {
  if (maxVal <= 0) return 10;
  const exponent = Math.floor(Math.log10(maxVal));
  const fraction = maxVal / Math.pow(10, exponent);

  let niceFraction = 1;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;

  return niceFraction * Math.pow(10, exponent);
}

function getTickValues(maxVal, count = 5) {
  const niceMax = getNiceMax(maxVal);
  const ticks = [];
  for (let i = 0; i <= count; i++) {
    ticks.push((niceMax / count) * i);
  }
  return ticks;
}

// ── Better chart ─────────────────────────────────────────────
function LineChart({ data, metricKey, metricFmt }) {
  const W = 1100;
  const H = 360;
  const PAD = { top: 24, right: 24, bottom: 56, left: 84 };
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
          color: "#8d86a8",
          fontSize: 14,
        }}
      >
        No data for selected filters
      </div>
    );
  }

  const values = data.map((d) => safeNum(d[metricKey]));
  const rawMax = Math.max(...values, 0);
  const maxVal = getNiceMax(rawMax || 10);
  const ticks = getTickValues(maxVal, 5);

  const xOf = (i) =>
    PAD.left + (data.length === 1 ? innerW / 2 : (i * innerW) / (data.length - 1));

  const yOf = (v) => PAD.top + innerH - (safeNum(v) / maxVal) * innerH;

  const points = data.map((d, i) => `${xOf(i)},${yOf(d[metricKey])}`).join(" ");

  const fillPoints = [
    `${xOf(0)},${PAD.top + innerH}`,
    ...data.map((d, i) => `${xOf(i)},${yOf(d[metricKey])}`),
    `${xOf(data.length - 1)},${PAD.top + innerH}`,
  ].join(" ");

  const xLabelStep =
    data.length <= 10 ? 1 :
    data.length <= 20 ? 2 :
    data.length <= 35 ? 4 :
    data.length <= 60 ? 6 : 8;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: H, overflow: "visible" }}
      aria-label="line chart"
    >
      {ticks.map((tick, idx) => {
        const y = yOf(tick);
        return (
          <g key={idx}>
            <line
              x1={PAD.left}
              y1={y}
              x2={PAD.left + innerW}
              y2={y}
              stroke="rgba(124,79,214,0.12)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 14}
              y={y + 4}
              textAnchor="end"
              fontSize="11"
              fill="#8d86a8"
            >
              {fmtNum(tick)}
            </text>
          </g>
        );
      })}

      <line
        x1={PAD.left}
        y1={PAD.top}
        x2={PAD.left}
        y2={PAD.top + innerH}
        stroke="rgba(124,79,214,0.18)"
      />
      <line
        x1={PAD.left}
        y1={PAD.top + innerH}
        x2={PAD.left + innerW}
        y2={PAD.top + innerH}
        stroke="rgba(124,79,214,0.18)"
      />

      <defs>
        <linearGradient id="trendAreaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(124,79,214,0.22)" />
          <stop offset="100%" stopColor="rgba(124,79,214,0.03)" />
        </linearGradient>
      </defs>

      <polygon points={fillPoints} fill="url(#trendAreaFill)" />

      <polyline
        points={points}
        fill="none"
        stroke="#7c4fd6"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {data.map((d, i) => {
        const cx = xOf(i);
        const cy = yOf(d[metricKey]);
        return (
          <g key={`${d.date}-${i}`}>
            <circle cx={cx} cy={cy} r={4.5} fill="#7c4fd6" stroke="#ffffff" strokeWidth={2} />
            <circle cx={cx} cy={cy} r={14} fill="transparent">
              <title>{`${d.date}: ${fmtValue(d[metricKey], metricFmt)}`}</title>
            </circle>
          </g>
        );
      })}

      {data.map((d, i) => {
        if (i % xLabelStep !== 0 && i !== data.length - 1) return null;
        const x = xOf(i);
        return (
          <g key={`x-${d.date}-${i}`}>
            <line
              x1={x}
              y1={PAD.top + innerH}
              x2={x}
              y2={PAD.top + innerH + 6}
              stroke="rgba(124,79,214,0.18)"
            />
            <text
              x={x}
              y={PAD.top + innerH + 22}
              textAnchor="middle"
              fontSize="11"
              fill="#8d86a8"
            >
              {formatShortDate(d.date)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Page ─────────────────────────────────────────────────────
export default function Trends() {
  const allGeos = useMemo(() => {
    return getAllGeos(
      Array.isArray(metaMasterData) ? metaMasterData : [],
      Array.isArray(leadsMasterData) ? leadsMasterData : []
    );
  }, []);

  const [dateRange, setDateRange] = useState("30d");
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
        <h3 className="section-title">{metric.label.toUpperCase()} OVER TIME</h3>
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
                {TREND_METRICS.map((m) => (
                  <th key={m.key} className="num-cell">{m.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trendRows.length > 0 ? (
                trendRows.map((row, i) => (
                  <tr key={`${row.date}-${i}`}>
                    <td>{row.date}</td>
                    {TREND_METRICS.map((m) => (
                      <td key={m.key} className="num-cell">
                        {fmtValue(row[m.key], m.fmt)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={1 + TREND_METRICS.length} className="num-cell">
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
