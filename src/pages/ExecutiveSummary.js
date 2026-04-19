import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

// ── UI config inside same file ────────────────────────────────
const RANGE_DAYS = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "60d": 60,
  "90d": 90,
};

const TIME_LABELS = {
  "1d": "Yesterday",
  "7d": "Last 7d",
  "30d": "Last 30d",
  "60d": "Last 60d",
  "90d": "Last 90d",
};

const KPI_CARDS = [
  { key: "spend", label: "Spend", icon: "💸", fmt: "money" },
  { key: "impressions", label: "Impressions", icon: "👁️", fmt: "num" },
  { key: "cpm", label: "CPM", icon: "📡", fmt: "money" },
  { key: "reach", label: "Reach", icon: "📶", fmt: "num" },
  { key: "clicks", label: "Clicks", icon: "🖱️", fmt: "num" },
  { key: "cpc", label: "CPC", icon: "🎯", fmt: "money" },
  { key: "leads", label: "Leads", icon: "✅", fmt: "num" },
  { key: "cpl", label: "CPL", icon: "💡", fmt: "money" },
  { key: "sql", label: "SQL", icon: "🏆", fmt: "num" },
  { key: "costPerSql", label: "Cost / SQL", icon: "🧮", fmt: "money" },
  { key: "pipeline", label: "Pipeline", icon: "📊", fmt: "usd" },
  { key: "closures", label: "Closures", icon: "🔐", fmt: "num" },
  { key: "closure", label: "Closure", icon: "🔒", fmt: "usd" },
];

const FUNNEL_KEYS = [
  { key: "spend", label: "Spend", icon: "💸", fmt: "money" },
  { key: "impressions", label: "Impressions", icon: "👁️", fmt: "num" },
  { key: "clicks", label: "Clicks", icon: "🖱️", fmt: "num" },
  { key: "leads", label: "Leads (MQL)", icon: "✅", fmt: "num" },
  { key: "sql", label: "SQL", icon: "🏆", fmt: "num" },
  { key: "pipeline", label: "Pipeline", icon: "📊", fmt: "usd" },
  { key: "closure", label: "Closure", icon: "🔒", fmt: "usd" },
];

// ── Helpers ───────────────────────────────────────────────────
function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmt(value, type = "num") {
  const n = Number(value || 0);

  if (type === "money") return `$${Math.round(n).toLocaleString()}`;
  if (type === "usd") return `$${Math.round(n).toLocaleString()}`;
  return Math.round(n).toLocaleString();
}

function formatDateOnly(d) {
  return d.toISOString().split("T")[0];
}

function getDateRange(timeRange) {
  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  if (timeRange === "1d") {
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23, 59, 59, 999);

    return { start: yesterdayStart, end: yesterdayEnd };
  }

  const days = RANGE_DAYS[timeRange] ?? 30;
  const start = new Date(todayStart);
  start.setDate(start.getDate() - days + 1);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getTopSqlRows(rows, limit = 15) {
  return [...rows]
    .sort((a, b) => safeNum(b.amount_usd) - safeNum(a.amount_usd))
    .slice(0, limit);
}

function getDisplayLink(row) {
  return row?.deal_link || row?.lead_link || "#";
}

function getDisplayCompany(row) {
  return row?.company || row?.deal_name || "—";
}

function getDisplaySize(row) {
  const branches = row?.number_of_locations ?? null;
  if (!branches && branches !== 0) return "—";
  return `${branches} ${branches === 1 ? "branch" : "branches"}`;
}

function buildKpi(metaRows, leadsCount, sqlRows, closedWonRows) {
  const spend = metaRows.reduce((s, r) => s + safeNum(r.spend_usd), 0);
  const impressions = metaRows.reduce((s, r) => s + safeNum(r.impressions), 0);
  const reach = metaRows.reduce((s, r) => s + safeNum(r.reach), 0);
  const clicks = metaRows.reduce((s, r) => s + safeNum(r.clicks), 0);
  const leads = safeNum(leadsCount);

  const sql = sqlRows.length;
  const pipeline = sqlRows.reduce((s, r) => s + safeNum(r.amount_usd), 0);

  const closures = closedWonRows.length;
  const closure = closedWonRows.reduce((s, r) => s + safeNum(r.amount_usd), 0);

  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpl = leads > 0 ? spend / leads : 0;
  const costPerSql = sql > 0 ? spend / sql : 0;

  return {
    spend,
    impressions,
    cpm,
    reach,
    clicks,
    cpc,
    leads,
    cpl,
    sql,
    costPerSql,
    pipeline,
    closures,
    closure,
  };
}

// ── Component ─────────────────────────────────────────────────
export default function ExecutiveSummary() {
  const [timeRange, setTimeRange] = useState("30d");
  const [metaRows, setMetaRows] = useState([]);
  const [supabaseLeadsCount, setSupabaseLeadsCount] = useState(0);
  const [supabaseSqlRows, setSupabaseSqlRows] = useState([]);
  const [supabaseClosedWonRows, setSupabaseClosedWonRows] = useState([]);

  useEffect(() => {
    let isActive = true;

    async function fetchExecutiveSummaryData() {
      try {
        const { start, end } = getDateRange(timeRange);
        const startIso = start.toISOString();
        const endIso = end.toISOString();
        const startDate = formatDateOnly(start);
        const endDate = formatDateOnly(end);

        const metaPromise = supabase
          .from("meta_performance")
          .select(`
            perf_date,
            level,
            impressions,
            clicks,
            reach,
            leads,
            spend_usd,
            country_name
          `)
          .eq("level", "ad")
          .gte("perf_date", startDate)
          .lte("perf_date", endDate);

        const leadsCountPromise = supabase
          .from("master_leads")
          .select("lead_id", { count: "exact", head: true })
          .gte("lead_created_date", startIso)
          .lte("lead_created_date", endIso);

        const sqlRowsPromise = supabase
          .from("master_leads")
          .select(`
            lead_id,
            deal_id,
            company,
            deal_name,
            country,
            amount_usd,
            number_of_locations,
            deal_link,
            lead_link,
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
            amount_usd,
            close_date
          `)
          .eq("is_closed_won", true)
          .gte("close_date", startIso)
          .lte("close_date", endIso);

        const [
          metaResponse,
          leadsCountResponse,
          sqlRowsResponse,
          closedWonRowsResponse,
        ] = await Promise.all([
          metaPromise,
          leadsCountPromise,
          sqlRowsPromise,
          closedWonRowsPromise,
        ]);

        if (!isActive) return;

        if (metaResponse.error) {
          console.error("Meta performance error:", metaResponse.error);
          setMetaRows([]);
        } else {
          setMetaRows(metaResponse.data || []);
        }

        if (leadsCountResponse.error) {
          console.error("Leads count error:", leadsCountResponse.error);
          setSupabaseLeadsCount(0);
        } else {
          setSupabaseLeadsCount(leadsCountResponse.count || 0);
        }

        if (sqlRowsResponse.error) {
          console.error("SQL rows error:", sqlRowsResponse.error);
          setSupabaseSqlRows([]);
        } else {
          setSupabaseSqlRows(sqlRowsResponse.data || []);
        }

        if (closedWonRowsResponse.error) {
          console.error("Closed won rows error:", closedWonRowsResponse.error);
          setSupabaseClosedWonRows([]);
        } else {
          setSupabaseClosedWonRows(closedWonRowsResponse.data || []);
        }
      } catch (err) {
        if (!isActive) return;
        console.error("Unexpected executive summary fetch error:", err);
        setMetaRows([]);
        setSupabaseLeadsCount(0);
        setSupabaseSqlRows([]);
        setSupabaseClosedWonRows([]);
      }
    }

    fetchExecutiveSummaryData();

    return () => {
      isActive = false;
    };
  }, [timeRange]);

  const kpi = useMemo(
    () =>
      buildKpi(
        metaRows,
        supabaseLeadsCount,
        supabaseSqlRows,
        supabaseClosedWonRows
      ),
    [metaRows, supabaseLeadsCount, supabaseSqlRows, supabaseClosedWonRows]
  );

  const topSqlRows = useMemo(
    () => getTopSqlRows(supabaseSqlRows, 15),
    [supabaseSqlRows]
  );

  const maxFunnel = kpi.spend || 1;

  return (
    <div className="page">
      <div className="filter-bar">
        {Object.keys(RANGE_DAYS).map((r) => (
          <button
            key={r}
            className={`filter-pill${timeRange === r ? " active" : ""}`}
            onClick={() => setTimeRange(r)}
          >
            {TIME_LABELS[r]}
          </button>
        ))}
      </div>

      <div className="kpi-grid">
        {KPI_CARDS.map((c) => (
          <div className="kpi-card" key={c.key}>
            <span className="kpi-icon">{c.icon}</span>
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-value">{fmt(kpi[c.key] ?? 0, c.fmt)}</div>
          </div>
        ))}
      </div>

      <div className="exec-split">
        <div className="card funnel-card">
          <h3 className="section-title">Conversion Funnel</h3>
          <div className="funnel-list">
            {FUNNEL_KEYS.map((step, i) => {
              const val = kpi[step.key] ?? 0;
              const pct =
                step.key === "spend"
                  ? 100
                  : Math.min(100, Math.round((val / maxFunnel) * 100));

              return (
                <div className="funnel-step" key={step.key}>
                  <div className="funnel-left">
                    <span className="funnel-icon">{step.icon}</span>
                    <span className="funnel-name">{step.label}</span>
                  </div>

                  <div className="funnel-bar-wrap">
                    <div className="funnel-bar-bg">
                      <div
                        className="funnel-bar-fill"
                        style={{
                          width: `${pct}%`,
                          opacity: 1 - i * 0.08,
                        }}
                      />
                    </div>
                  </div>

                  <div className="funnel-val">{fmt(val, step.fmt)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card sql-preview-card">
          <h3 className="section-title">Top SQLs</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Deal Value</th>
                  <th>Size</th>
                  <th>Geo</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {topSqlRows.length > 0 ? (
                  topSqlRows.map((row, idx) => (
                    <tr key={row.lead_id || row.deal_id || idx}>
                      <td>{getDisplayCompany(row)}</td>
                      <td className="num-cell">{fmt(safeNum(row.amount_usd), "usd")}</td>
                      <td>
                        <span className="size-badge">{getDisplaySize(row)}</span>
                      </td>
                      <td>
                        <span className="geo-tag">{row.country || "—"}</span>
                      </td>
                      <td>
                        <a
                          className="hs-link"
                          href={getDisplayLink(row)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          ↗
                        </a>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "16px" }}>
                      No SQL data for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="ai-grid">
        <div className="ai-block ai-green">
          <div className="ai-block-label">✅ What Went Right</div>
          <ul className="ai-block-list">
            <li>Algeria &amp; Tunisia drove 40%+ of MQLs at under 20% of spend</li>
            <li>Philippines CPL dropped to $62 — lowest geo in portfolio</li>
            <li>SQL rate improved to 8.4% vs 5.1% prior period</li>
          </ul>
        </div>

        <div className="ai-block ai-red">
          <div className="ai-block-label">❌ What Went Wrong</div>
          <ul className="ai-block-list">
            <li>UK &amp; AUS consuming 49% of budget at 3–5× average CPL</li>
            <li>March campaign edits triggered multiple learning phase resets</li>
            <li>Retargeting audience overlap inflating impression share</li>
          </ul>
        </div>

        <div className="ai-block ai-blue">
          <div className="ai-block-label">⚡ Recommendations</div>
          <ul className="ai-block-list">
            <li>Shift 20% UK/AUS budget → DZA / TUN / PHL immediately</li>
            <li>Freeze campaign structure for 7 days to stabilise learning</li>
            <li>Launch 3-way creative split test in top geos with DM + Lead Gen</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
