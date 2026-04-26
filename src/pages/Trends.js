import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "../lib/supabase";

const RANGE_DAYS = { "7d": 7, "30d": 30, "60d": 60, "90d": 90 };

const DATE_RANGES = [
  { v: "7d", l: "Last 7d" },
  { v: "30d", l: "Last 30d" },
  { v: "60d", l: "Last 60d" },
  { v: "90d", l: "Last 90d" },
];

const TREND_METRICS = [
  { key: "spend", label: "Spend", fmt: "money" },
  { key: "leads", label: "Leads", fmt: "num" },
  { key: "sql", label: "SQL", fmt: "num" },
  { key: "pipeline", label: "Pipeline", fmt: "usd" },
  { key: "closures", label: "Closures", fmt: "num" },
  { key: "closureValue", label: "Closure $", fmt: "usd" },
];

const DISPLAY_NAME_OVERRIDES = {
  "United Kingdom": "UK",
  "United Arab Emirates": "UAE",
  "United States": "USA",
};

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtUSD(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtNum(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtCompact(value, type = "num") {
  const n = safeNum(value);
  const prefix = type === "money" || type === "usd" ? "$" : "";

  if (n >= 1000000) return `${prefix}${(n / 1000000).toFixed(n >= 10000000 ? 0 : 1)}M`;
  if (n >= 1000) return `${prefix}${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return `${prefix}${Math.round(n).toLocaleString()}`;
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

function getDateRange(rangeKey, customRange = null) {
  if (customRange?.from && customRange?.to) {
    return {
      start: new Date(`${customRange.from}T00:00:00`),
      end: new Date(`${customRange.to}T23:59:59.999`),
    };
  }

  const now = new Date();
  const days = RANGE_DAYS[rangeKey] ?? 30;

  const start = new Date(now);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function daysBetween(start, end) {
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

function isWithinRange(dateValue, rangeKey, customRange = null) {
  const d = parseDate(dateValue);
  if (!d) return false;
  const { start, end } = getDateRange(rangeKey, customRange);
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
  return normalizeMasterCountry(raw);
}

/* Only show geos where Spend > $10 */
function getAllGeos(metaRows, leadRows, rangeKey, customRange = null) {
  const spendByGeo = {};

  (metaRows || []).forEach((row) => {
    const geo = normalizeMetaCountry(row.country_name);
    if (!isWithinRange(row.perf_date, rangeKey, customRange)) return;
    spendByGeo[geo] = (spendByGeo[geo] || 0) + safeNum(row.spend_usd);
  });

  return Object.keys(spendByGeo)
    .filter((geo) => spendByGeo[geo] > 10)
    .sort((a, b) => spendByGeo[b] - spendByGeo[a]);
}

function getBucketMode(rangeKey, customRange = null) {
  if (customRange?.from && customRange?.to) {
    const { start, end } = getDateRange(rangeKey, customRange);
    return daysBetween(start, end) > 45 ? "week" : "day";
  }
  return rangeKey === "60d" || rangeKey === "90d" ? "week" : "day";
}

function startOfUtcWeek(dateValue) {
  const d = parseDate(dateValue);
  if (!d) return null;

  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = utc.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + diff);
  utc.setUTCHours(0, 0, 0, 0);
  return utc;
}

function getBucketKey(dateValue, mode) {
  if (mode === "week") {
    const d = startOfUtcWeek(dateValue);
    return d ? d.toISOString().slice(0, 10) : null;
  }
  return toDayKey(dateValue);
}

function getBucketLabel(bucketKey, mode) {
  if (mode === "week") {
    const d = parseDate(bucketKey);
    if (!d) return bucketKey;
    const end = new Date(d);
    end.setUTCDate(end.getUTCDate() + 6);
    return `${formatShortDate(d)} - ${formatShortDate(end)}`;
  }
  return formatShortDate(bucketKey);
}

function getBucketKeys(rangeKey, customRange = null) {
  const { start, end } = getDateRange(rangeKey, customRange);
  const mode = getBucketMode(rangeKey, customRange);
  const out = [];

  if (mode === "day") {
    const d = new Date(start);
    while (d <= end) {
      out.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }

  const firstWeek = startOfUtcWeek(start);
  const d = new Date(firstWeek);

  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 7);
  }

  return out;
}

function buildTrendRows(metaRows, leadRows, rangeKey, selectedGeos, customRange = null) {
  const bucketMode = getBucketMode(rangeKey, customRange);
  const bucketKeys = getBucketKeys(rangeKey, customRange);
  const byBucket = {};

  bucketKeys.forEach((bucketKey) => {
    byBucket[bucketKey] = {
      bucketKey,
      label: getBucketLabel(bucketKey, bucketMode),
      spend: 0,
      leads: 0,
      sql: 0,
      pipeline: 0,
      closures: 0,
      closureValue: 0,
    };
  });

  (metaRows || []).forEach((row) => {
    const geo = normalizeMetaCountry(row.country_name);
    if (!selectedGeos.includes(geo)) return;

    const bucketKey = getBucketKey(row.perf_date, bucketMode);
    if (!bucketKey || !byBucket[bucketKey]) return;

    byBucket[bucketKey].spend += safeNum(row.spend_usd);
  });

  (leadRows || []).forEach((row) => {
    const geo = normalizeMasterCountry(row.country);
    if (!selectedGeos.includes(geo)) return;

    if (isWithinRange(row.lead_created_date, rangeKey, customRange)) {
      const bucketKey = getBucketKey(row.lead_created_date, bucketMode);
      if (bucketKey && byBucket[bucketKey]) byBucket[bucketKey].leads += 1;
    }

    if (row.is_sql === true && isWithinRange(row.sql_date, rangeKey, customRange)) {
      const bucketKey = getBucketKey(row.sql_date, bucketMode);
      if (bucketKey && byBucket[bucketKey]) {
        byBucket[bucketKey].sql += 1;
        byBucket[bucketKey].pipeline += safeNum(row.amount_usd);
      }
    }

    if (row.is_closed_won === true && isWithinRange(row.close_date, rangeKey, customRange)) {
      const bucketKey = getBucketKey(row.close_date, bucketMode);
      if (bucketKey && byBucket[bucketKey]) {
        byBucket[bucketKey].closures += 1;
        byBucket[bucketKey].closureValue += safeNum(row.amount_usd);
      }
    }
  });

  return bucketKeys.map((bucketKey) => byBucket[bucketKey]);
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

function getTickValues(maxVal, count = 4) {
  const niceMax = getNiceMax(maxVal);
  const ticks = [];
  for (let i = 0; i <= count; i++) ticks.push((niceMax / count) * i);
  return ticks;
}

function LineChart({ data, metricKey, metricFmt }) {
  const W = 1100;
  const H = 360;
  const PAD = { top: 18, right: 36, bottom: 48, left: 64 };
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
  const ticks = getTickValues(maxVal, 4);

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
    data.length <= 8 ? 1 :
    data.length <= 16 ? 2 :
    data.length <= 32 ? 3 :
    data.length <= 60 ? 5 : 7;

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
              stroke="rgba(124,79,214,0.10)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 14}
              y={y + 4}
              textAnchor="end"
              fontSize="11"
              fill="#8d86a8"
            >
              {fmtCompact(tick, metricFmt)}
            </text>
          </g>
        );
      })}

      <line
        x1={PAD.left}
        y1={PAD.top + innerH}
        x2={PAD.left + innerW}
        y2={PAD.top + innerH}
        stroke="rgba(124,79,214,0.18)"
      />

      <defs>
        <linearGradient id="trendAreaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(124,79,214,0.20)" />
          <stop offset="100%" stopColor="rgba(124,79,214,0.02)" />
        </linearGradient>
      </defs>

      <polygon points={fillPoints} fill="url(#trendAreaFill)" />

      <polyline
        points={points}
        fill="none"
        stroke="#7c4fd6"
        strokeWidth="3.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {data.map((d, i) => {
        const cx = xOf(i);
        const cy = yOf(d[metricKey]);

        return (
          <g key={`${d.bucketKey}-${i}`}>
            <circle cx={cx} cy={cy} r={4.4} fill="#7c4fd6" stroke="#ffffff" strokeWidth={2} />
            <circle cx={cx} cy={cy} r={14} fill="transparent">
              <title>{`${d.label}: ${fmtValue(d[metricKey], metricFmt)}`}</title>
            </circle>
          </g>
        );
      })}

      {data.map((d, i) => {
        if (i % xLabelStep !== 0 && i !== data.length - 1) return null;
        const x = xOf(i);

        return (
          <g key={`x-${d.bucketKey}-${i}`}>
            <line
              x1={x}
              y1={PAD.top + innerH}
              x2={x}
              y2={PAD.top + innerH + 6}
              stroke="rgba(124,79,214,0.16)"
            />
            <text
              x={x}
              y={PAD.top + innerH + 22}
              textAnchor="middle"
              fontSize="11"
              fill="#8d86a8"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Trends() {
  const [dateRange, setDateRange] = useState("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customRange, setCustomRange] = useState(null);

  const [supabaseMetaRows, setSupabaseMetaRows] = useState([]);
  const [supabaseLeadRows, setSupabaseLeadRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGeos, setSelectedGeos] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState("leads");

  const activeCustomRange = dateRange === "custom" ? customRange : null;

  const handlePresetRange = (rangeKey) => {
    setDateRange(rangeKey);
    setCustomRange(null);
  };

  const handleApplyCustomRange = () => {
    if (!customFrom || !customTo) return;

    const from = new Date(`${customFrom}T00:00:00`);
    const to = new Date(`${customTo}T23:59:59.999`);

    if (from > to) {
      alert("From date cannot be after To date");
      return;
    }

    setCustomRange({ from: customFrom, to: customTo });
    setDateRange("custom");
  };

  const handleClearCustomRange = () => {
    setCustomRange(null);
    setCustomFrom("");
    setCustomTo("");
    setDateRange("30d");
  };

  useEffect(() => {
    async function fetchTrendData() {
      try {
        setLoading(true);

        const { start, end } = getDateRange(dateRange, activeCustomRange);
        const startDate = start.toISOString().slice(0, 10);
        const endDate = end.toISOString().slice(0, 10);
        const startIso = start.toISOString();
        const endIso = end.toISOString();

        const [metaRows, leadData] = await Promise.all([
          (async () => {
            let allRows = [];
            let from = 0;
            const pageSize = 1000;

            while (true) {
              const { data, error } = await supabase
                .from("meta_performance")
                .select("perf_date, spend_usd, country_name")
                .eq("level", "ad")
                .gte("perf_date", startDate)
                .lte("perf_date", endDate)
                .range(from, from + pageSize - 1);

              if (error) throw error;

              const rows = data || [];
              allRows = allRows.concat(rows);

              if (rows.length < pageSize) break;
              from += pageSize;
            }

            return allRows;
          })(),

          (async () => {
            let allRows = [];
            let from = 0;
            const pageSize = 1000;

            while (true) {
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
                )
                .range(from, from + pageSize - 1);

              if (error) throw error;

              const rows = data || [];
              allRows = allRows.concat(rows);

              if (rows.length < pageSize) break;
              from += pageSize;
            }

            return allRows;
          })(),
        ]);

        setSupabaseMetaRows(metaRows);
        setSupabaseLeadRows(leadData);
      } catch (err) {
        console.error("Unexpected Trends fetch error:", err);
        setSupabaseMetaRows([]);
        setSupabaseLeadRows([]);
      } finally {
        setLoading(false);
      }
    }

    fetchTrendData();
  }, [dateRange, activeCustomRange]);

  const allGeos = useMemo(() => {
    return getAllGeos(supabaseMetaRows, supabaseLeadRows, dateRange, activeCustomRange);
  }, [supabaseMetaRows, supabaseLeadRows, dateRange, activeCustomRange]);

  useEffect(() => {
    if (!allGeos.length) {
      setSelectedGeos([]);
      return;
    }

    setSelectedGeos((prev) => {
      if (!prev.length) return allGeos;
      const valid = prev.filter((g) => allGeos.includes(g));
      return valid.length ? valid : allGeos;
    });
  }, [allGeos]);

  const toggleGeo = (geo) => {
    setSelectedGeos((prev) => {
      if (prev.includes(geo)) return prev.filter((g) => g !== geo);
      return [...prev, geo];
    });
  };

  const selectAllGeos = () => setSelectedGeos(allGeos);
  const clearAllGeos = () => setSelectedGeos([]);

  const trendRows = useMemo(() => {
    return buildTrendRows(
      supabaseMetaRows,
      supabaseLeadRows,
      dateRange,
      selectedGeos,
      activeCustomRange
    );
  }, [dateRange, selectedGeos, supabaseMetaRows, supabaseLeadRows, activeCustomRange]);

  const metric = TREND_METRICS.find((m) => m.key === selectedMetric) || TREND_METRICS[0];

  const chartSummary = useMemo(() => {
    const total = trendRows.reduce((s, r) => s + safeNum(r[selectedMetric]), 0);
    const peak = [...trendRows].sort((a, b) => safeNum(b[selectedMetric]) - safeNum(a[selectedMetric]))[0];
    const avg = trendRows.length ? total / trendRows.length : 0;

    return {
      total,
      avg,
      peakLabel: peak?.label || "—",
      peakValue: peak ? safeNum(peak[selectedMetric]) : 0,
    };
  }, [trendRows, selectedMetric]);

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
            onClick={() => handlePresetRange(r.v)}
          >
            {r.l}
          </button>
        ))}

        <div className="filter-sep" />

        <input
          type="date"
          value={customFrom}
          onChange={(e) => setCustomFrom(e.target.value)}
          className="filter-pill"
          style={{ height: 34 }}
        />

        <input
          type="date"
          value={customTo}
          onChange={(e) => setCustomTo(e.target.value)}
          className="filter-pill"
          style={{ height: 34 }}
        />

        <button
          className={`filter-pill ${dateRange === "custom" ? "active" : ""}`}
          onClick={handleApplyCustomRange}
        >
          Apply
        </button>

        {dateRange === "custom" && (
          <button className="filter-pill" onClick={handleClearCustomRange}>
            Clear
          </button>
        )}
      </div>

      <div className="filter-bar">
        <button
          className={`filter-pill ${selectedGeos.length === allGeos.length && allGeos.length > 0 ? "active" : ""}`}
          onClick={selectAllGeos}
        >
          Select All
        </button>

        <button
          className={`filter-pill ${selectedGeos.length === 0 ? "active" : ""}`}
          onClick={clearAllGeos}
        >
          Clear All
        </button>

        <div className="filter-sep" />

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
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <h3 className="section-title" style={{ marginBottom: 6 }}>
              {metric.label.toUpperCase()} OVER TIME
            </h3>
            <div style={{ fontSize: 12, color: "#8d86a8" }}>
              {selectedGeos.length} geo(s) selected
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <div className="geo-tag">Total: {fmtValue(chartSummary.total, metric.fmt)}</div>
            <div className="geo-tag">Avg: {fmtValue(chartSummary.avg, metric.fmt)}</div>
            <div className="geo-tag">
              Peak: {chartSummary.peakLabel} · {fmtValue(chartSummary.peakValue, metric.fmt)}
            </div>
          </div>
        </div>

        <LineChart data={trendRows} metricKey={selectedMetric} metricFmt={metric.fmt} />
      </div>

      <div className="card">
        <h3 className="section-title">Data Table</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{getBucketMode(dateRange, activeCustomRange) === "week" ? "Week" : "Date"}</th>
                {TREND_METRICS.map((m) => (
                  <th key={m.key} className="num-cell">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {trendRows.length > 0 ? (
                trendRows.map((row, i) => (
                  <tr key={`${row.bucketKey}-${i}`}>
                    <td>{row.label}</td>
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
