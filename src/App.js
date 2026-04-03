import React, { useState, useEffect } from "react";

/* ============================================================
   CONSTANTS
   ============================================================ */
const GITHUB_RAW =
  "https://raw.githubusercontent.com/Pavanrajshetty/supy-dashboard/main/data/meta/meta_data.json";

const TIME_RANGES = [
  { label: "Yesterday",   value: "1d"  },
  { label: "Last 7 days", value: "7d"  },
  { label: "Last 30 days",value: "30d" },
  { label: "Last 60 days",value: "60d" },
  { label: "Last 90 days",value: "90d" },
];

/* ── Placeholder KPI data (replace with derived values later) ── */
const PLACEHOLDER_KPIS = [
  { key:"spend",       label:"Spend",          value:"AED 1,22,840", icon:"💸", delta:"+12%",    dir:"up",      type:"spend"    },
  { key:"impressions", label:"Impressions",     value:"4.2M",         icon:"👁",  delta:"+8%",     dir:"up",      type:""         },
  { key:"cpm",         label:"CPM",             value:"AED 29.2",     icon:"📡", delta:"-3%",     dir:"down",    type:""         },
  { key:"reach",       label:"Reach",           value:"1.1M",         icon:"📶", delta:"+5%",     dir:"up",      type:""         },
  { key:"clicks",      label:"Clicks",          value:"18,430",       icon:"🖱️", delta:"+19%",    dir:"up",      type:"clicks"   },
  { key:"cpc",         label:"CPC",             value:"AED 6.67",     icon:"🎯", delta:"-4%",     dir:"up",      type:""         },
  { key:"leads",       label:"Leads",           value:"751",          icon:"✅", delta:"+22%",    dir:"up",      type:"leads"    },
  { key:"cpl",         label:"CPL",             value:"AED 163.6",    icon:"💡", delta:"-9%",     dir:"up",      type:""         },
  { key:"sql",         label:"SQL",             value:"63",           icon:"🏆", delta:"+31%",    dir:"up",      type:"sql"      },
  { key:"cpSql",       label:"Cost / SQL",      value:"AED 1,950",    icon:"🧮", delta:"-6%",     dir:"up",      type:""         },
  { key:"pipeline",    label:"Pipeline Value",  value:"$420K",        icon:"📈", delta:"new",     dir:"neutral", type:"pipeline" },
  { key:"closure",     label:"Closure Value",   value:"$84K",         icon:"🔒", delta:"new",     dir:"neutral", type:""         },
];

/* ── Placeholder funnel steps ─────────────────────────────────── */
const FUNNEL_STEPS = [
  { name:"Spend",       value:"AED 1,22,840", pct:100, icon:"💸" },
  { name:"Impressions", value:"4.2M",          pct:95,  icon:"👁"  },
  { name:"Clicks",      value:"18,430",         pct:72,  icon:"🖱️" },
  { name:"Leads",       value:"751",            pct:42,  icon:"✅"  },
  { name:"SQL",         value:"63",             pct:22,  icon:"🏆"  },
  { name:"Pipeline",    value:"$420K",          pct:14,  icon:"📈"  },
  { name:"Closure",     value:"$84K",           pct:7,   icon:"🔒"  },
];

/* ── Placeholder SQL table rows ───────────────────────────────── */
const PLACEHOLDER_SQLS = [
  { company:"The Grill House Group", amount:"$28,000", size:"Enterprise", geo:"🇦🇪 UAE",  hsUrl:"#" },
  { company:"Nando's MENA",          amount:"$15,500", size:"Mid-Market", geo:"🇸🇦 KSA",  hsUrl:"#" },
  { company:"Cravia Inc.",           amount:"$22,000", size:"Enterprise", geo:"🇦🇪 UAE",  hsUrl:"#" },
  { company:"The Chefs Table",       amount:"$9,200",  size:"SMB",        geo:"🇬🇧 UK",   hsUrl:"#" },
  { company:"Zahle Restaurant Group",amount:"$18,700", size:"Mid-Market", geo:"🇩🇿 DZA",  hsUrl:"#" },
  { company:"Foodmark Philippines",  amount:"$11,400", size:"Mid-Market", geo:"🇵🇭 PHL",  hsUrl:"#" },
  { company:"Almaza Hospitality",    amount:"$31,000", size:"Enterprise", geo:"🇪🇬 Egypt",hsUrl:"#" },
];

/* ── AI summary placeholder copy ─────────────────────────────── */
const AI_BLOCKS = [
  {
    slot:"right", label:"✅ What Went Right",
    items:[
      "Algeria & Tunisia drove 40%+ of leads at <20% of spend",
      "Philippines CPL dropped to AED 62 — lowest geo in portfolio",
      "SQL rate improved to 8.4% vs 5.1% prior period",
    ],
  },
  {
    slot:"wrong", label:"❌ What Went Wrong",
    items:[
      "UK & AUS consuming 49% of budget at 3–5× average CPL",
      "March 9–11 campaign edits triggered learning phase reset",
      "Retargeting audience overlap inflating impression share",
    ],
  },
  {
    slot:"insight", label:"💡 Insights",
    items:[
      "GCC audiences have 2.1× higher SQL-to-MQL conversion vs global average",
      "Advantage+ campaigns show N/A on creative-level data — blind spot",
      "Pipeline value concentration in UAE suggests narrowing ICP fit",
    ],
  },
  {
    slot:"action", label:"⚡ Recommended Actions",
    items:[
      "Shift 20% UK/AUS budget → DZA/TUN/PHL this week",
      "Freeze campaign structure for 7 days to exit learning phase",
      "Launch creative split test in top-3 geos with DM + Lead Gen forms",
    ],
  },
];

/* ============================================================
   HELPER COMPONENTS
   ============================================================ */

function Navbar({ activePage, setActivePage }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-brand-icon">S</div>
        Supy Marketing
      </div>

      <div className="navbar-tabs">
        <button
          className={`nav-tab ${activePage === "executive" ? "active" : ""}`}
          onClick={() => setActivePage("executive")}
        >
          Executive
        </button>
        <button
          className={`nav-tab ${activePage === "sql" ? "active" : ""}`}
          onClick={() => setActivePage("sql")}
        >
          SQL
        </button>
      </div>

      <div className="navbar-meta">
        <span className="data-badge">
          <span className="data-badge-dot" />
          Live · Meta + HubSpot
        </span>
      </div>
    </nav>
  );
}

function TimeFilterBar({ selected, onChange }) {
  return (
    <div className="time-filter-bar">
      {TIME_RANGES.map((r) => (
        <button
          key={r.value}
          className={`time-btn ${selected === r.value ? "active" : ""}`}
          onClick={() => onChange(r.value)}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function KpiGrid({ kpis }) {
  return (
    <section>
      <p className="section-label">Performance Overview</p>
      <div className="kpi-grid">
        {kpis.map((k) => (
          <div className="kpi-card" key={k.key} data-type={k.type}>
            <span className="kpi-icon">{k.icon}</span>
            <p className="kpi-label">{k.label}</p>
            <p className="kpi-value">{k.value}</p>
            <p className={`kpi-delta ${k.dir}`}>
              {k.dir === "up"      && "▲ "}
              {k.dir === "down"    && "▼ "}
              {k.dir === "neutral" && "— "}
              {k.delta} vs prev period
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FunnelCard() {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Conversion Funnel</span>
        <span className="card-badge">D−2 settled</span>
      </div>
      <div className="card-body">
        <div className="funnel-list">
          {FUNNEL_STEPS.map((step, i) => (
            <div className="funnel-step" key={step.name}>
              <div className="funnel-icon">{step.icon}</div>
              <div className="funnel-bar-wrap">
                <span className="funnel-step-name">{step.name}</span>
                <div className="funnel-bar-bg">
                  <div
                    className="funnel-bar-fill"
                    style={{ width: `${step.pct}%` }}
                  />
                </div>
              </div>
              <span className="funnel-value">{step.value}</span>
              {i < FUNNEL_STEPS.length - 1 && (
                <div className="funnel-connector" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SqlTableCard({ rows }) {
  const sizeClass = (size) =>
    size === "Enterprise" ? "enterprise" : size === "Mid-Market" ? "mid-market" : "smb";

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Top SQLs This Period</span>
        <span className="card-badge">{rows.length} deals</span>
      </div>
      <div className="card-body" style={{ padding: "0" }}>
        <div className="sql-table-wrap">
          <table className="sql-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Amount</th>
                <th>Size</th>
                <th>Geo</th>
                <th>HubSpot</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td>
                    <div className="company-cell">
                      <div className="company-avatar">
                        {row.company.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="company-name">{row.company}</span>
                    </div>
                  </td>
                  <td>
                    <span className="amount-cell">{row.amount}</span>
                  </td>
                  <td>
                    <span className={`size-badge ${sizeClass(row.size)}`}>
                      {row.size}
                    </span>
                  </td>
                  <td>
                    <span className="geo-tag">{row.geo}</span>
                  </td>
                  <td>
                    <a
                      className="hs-link"
                      href={row.hsUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      ↗ View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AiSummaryCard() {
  return (
    <div className="ai-summary-card">
      <div className="ai-summary-header">
        <div className="ai-summary-icon">✦</div>
        <div>
          <p className="ai-summary-header-title">AI Marketing Intelligence</p>
          <p className="ai-summary-header-sub">
            Auto-generated · Last synced just now
          </p>
        </div>
      </div>
      <div className="ai-summary-grid">
        {AI_BLOCKS.map((block) => (
          <div className="ai-block" key={block.slot}>
            <p className={`ai-block-label ${block.slot}`}>{block.label}</p>
            <div className="ai-block-text">
              <ul>
                {block.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   PAGES
   ============================================================ */

function ExecutivePage({ selectedTimeRange, setSelectedTimeRange, data, loading, error }) {
  return (
    <>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Executive Dashboard</h1>
          <p className="page-subtitle">
            Supy · Paid Social Performance · Meta + HubSpot
          </p>
        </div>
        <TimeFilterBar
          selected={selectedTimeRange}
          onChange={setSelectedTimeRange}
        />
      </div>

      {/* ── Data state banners ── */}
      {loading && (
        <div className="state-banner loading">
          ⏳ Fetching latest data from GitHub…
        </div>
      )}
      {error && (
        <div className="state-banner error">
          ⚠ Could not load data — showing placeholder values. ({error})
        </div>
      )}

      {/* ── KPI Grid ── */}
      <KpiGrid kpis={PLACEHOLDER_KPIS} />

      {/* ── Main 2-col ── */}
      <div className="main-grid">
        <FunnelCard />
        <SqlTableCard rows={PLACEHOLDER_SQLS} />
      </div>

      {/* ── AI Summary ── */}
      <AiSummaryCard />
    </>
  );
}

function SqlPage() {
  return (
    <div className="placeholder-page">
      <div className="placeholder-icon">🗂</div>
      <h2 className="placeholder-title">SQL Page</h2>
      <p className="placeholder-sub">
        Full SQL pipeline view coming soon — deal-level analytics, source
        attribution, and stage velocity will live here.
      </p>
    </div>
  );
}

/* ============================================================
   ROOT APP
   ============================================================ */

export default function App() {
  /* ── State ─────────────────────────────────────────────────── */
  const [activePage, setActivePage] = useState("executive");
  const [selectedTimeRange, setSelectedTimeRange] = useState("30d");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ── Data Fetch (basic) ──────────────────────────────────────
     Placeholder fetch from GitHub JSON.
     No processing logic yet — just store raw response.
     Real derivation (KPI calc, filtering by date range) added later.
  ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(GITHUB_RAW);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(Array.isArray(json) ? json : [json]);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);          // re-fetch when selectedTimeRange changes once wired to API

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="page-shell">
      <Navbar activePage={activePage} setActivePage={setActivePage} />

      <div className="page-container">
        {activePage === "executive" && (
          <ExecutivePage
            selectedTimeRange={selectedTimeRange}
            setSelectedTimeRange={setSelectedTimeRange}
            data={data}
            loading={loading}
            error={error}
          />
        )}
        {activePage === "sql" && <SqlPage />}
      </div>
    </div>
  );
}
