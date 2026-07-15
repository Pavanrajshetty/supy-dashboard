import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";

const RANGE_DAYS = { "7d": 7, "30d": 30, "60d": 60, "90d": 90, all: null };
const RANGE_LABELS = { "7d": "Last 7d", "30d": "Last 30d", "60d": "Last 60d", "90d": "Last 90d", all: "All time" };

const KPI_CARDS = [
  { key: "spend", label: "Spend", icon: "💸", fmt: "money" },
  { key: "impressions", label: "Impressions", icon: "👁️", fmt: "num" },
  { key: "clicks", label: "Clicks", icon: "🖱️", fmt: "num" },
  { key: "ctr", label: "CTR", icon: "📈", fmt: "pct" },
  { key: "avgCpc", label: "Avg CPC", icon: "🎯", fmt: "money" },
  { key: "conversions", label: "Conversions", icon: "✅", fmt: "num" },
  { key: "costPerConv", label: "Cost / Conv", icon: "🧮", fmt: "money" },
  { key: "searchIS", label: "Search Impr. Share", icon: "📡", fmt: "pct" },
  { key: "lostBudget", label: "Lost IS (Budget)", icon: "🚧", fmt: "pct" },
  { key: "lostRank", label: "Lost IS (Rank)", icon: "📉", fmt: "pct" },
];

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(v) {
  return `$${Math.round(Number(v || 0)).toLocaleString()}`;
}

function fmtNum(v) {
  return Math.round(Number(v || 0)).toLocaleString();
}

function fmtPct(v) {
  return `${(Number(v || 0) * 100).toFixed(1)}%`;
}

function fmt(value, type) {
  if (type === "money") return fmtMoney(value);
  if (type === "pct") return fmtPct(value);
  return fmtNum(value);
}

function getStartDate(rangeKey) {
  const days = RANGE_DAYS[rangeKey];
  if (days === null) return null; // all time
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
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

export default function GoogleAdsExecutive() {
  const [range, setRange] = useState("30d");
  const [campaignDaily, setCampaignDaily] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isActive = true;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const startDate = getStartDate(range);

        const [dailyRows, campaignRows] = await Promise.all([
          fetchAllRows(() => {
            let q = supabase
              .from("google_ads_campaign_daily")
              .select("campaign_id, date, impressions, clicks, cost, conversions, ctr, avg_cpc, search_impression_share, search_lost_is_budget, search_lost_is_rank");
            if (startDate) q = q.gte("date", startDate);
            return q;
          }),
          supabase
            .from("google_ads_campaigns")
            .select("campaign_id, campaign_name, status, budget_amount"),
        ]);

        if (!isActive) return;
        setCampaignDaily(dailyRows);
        setCampaigns(campaignRows.data || []);
      } catch (err) {
        if (!isActive) return;
        console.error("Google Ads executive fetch error:", err);
        setError(err.message || "Failed to load Google Ads data");
        setCampaignDaily([]);
        setCampaigns([]);
      } finally {
        if (isActive) setLoading(false);
      }
    }

    fetchData();
    return () => { isActive = false; };
  }, [range]);

  const campaignNameMap = useMemo(() => {
    const m = {};
    campaigns.forEach((c) => { m[c.campaign_id] = c; });
    return m;
  }, [campaigns]);

  const kpi = useMemo(() => {
    const totals = campaignDaily.reduce(
      (acc, r) => {
        acc.spend += safeNum(r.cost);
        acc.impressions += safeNum(r.impressions);
        acc.clicks += safeNum(r.clicks);
        acc.conversions += safeNum(r.conversions);
        acc.isWeightSum += safeNum(r.search_impression_share) * safeNum(r.impressions);
        acc.lostBudgetWeightSum += safeNum(r.search_lost_is_budget) * safeNum(r.impressions);
        acc.lostRankWeightSum += safeNum(r.search_lost_is_rank) * safeNum(r.impressions);
        acc.isWeightTotal += safeNum(r.impressions);
        return acc;
      },
      { spend: 0, impressions: 0, clicks: 0, conversions: 0, isWeightSum: 0, lostBudgetWeightSum: 0, lostRankWeightSum: 0, isWeightTotal: 0 }
    );

    const ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;
    const avgCpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
    const costPerConv = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
    const searchIS = totals.isWeightTotal > 0 ? totals.isWeightSum / totals.isWeightTotal : 0;
    const lostBudget = totals.isWeightTotal > 0 ? totals.lostBudgetWeightSum / totals.isWeightTotal : 0;
    const lostRank = totals.isWeightTotal > 0 ? totals.lostRankWeightSum / totals.isWeightTotal : 0;

    return {
      spend: totals.spend,
      impressions: totals.impressions,
      clicks: totals.clicks,
      conversions: totals.conversions,
      ctr,
      avgCpc,
      costPerConv,
      searchIS,
      lostBudget,
      lostRank,
    };
  }, [campaignDaily]);

  const topCampaigns = useMemo(() => {
    const byCampaign = {};
    campaignDaily.forEach((r) => {
      if (!byCampaign[r.campaign_id]) {
        byCampaign[r.campaign_id] = {
          campaign_id: r.campaign_id,
          spend: 0, impressions: 0, clicks: 0, conversions: 0,
          isWeightSum: 0, isWeightTotal: 0,
        };
      }
      const b = byCampaign[r.campaign_id];
      b.spend += safeNum(r.cost);
      b.impressions += safeNum(r.impressions);
      b.clicks += safeNum(r.clicks);
      b.conversions += safeNum(r.conversions);
      b.isWeightSum += safeNum(r.search_impression_share) * safeNum(r.impressions);
      b.isWeightTotal += safeNum(r.impressions);
    });

    return Object.values(byCampaign)
      .map((b) => ({
        ...b,
        name: campaignNameMap[b.campaign_id]?.campaign_name || `Campaign ${b.campaign_id}`,
        status: campaignNameMap[b.campaign_id]?.status || "—",
        ctr: b.impressions > 0 ? b.clicks / b.impressions : 0,
        searchIS: b.isWeightTotal > 0 ? b.isWeightSum / b.isWeightTotal : 0,
        costPerConv: b.conversions > 0 ? b.spend / b.conversions : 0,
      }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 10);
  }, [campaignDaily, campaignNameMap]);

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">Google Ads — Executive Summary</h2>
      </div>

      <div className="filter-bar">
        {Object.keys(RANGE_LABELS).map((r) => (
          <button
            key={r}
            className={`filter-pill ${range === r ? "active" : ""}`}
            onClick={() => setRange(r)}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>

      {error && (
        <div className="card" style={{ color: "#d64545" }}>
          ⚠️ {error}
        </div>
      )}

      <div className="kpi-grid">
        {KPI_CARDS.map((c) => (
          <div className="kpi-card" key={c.key}>
            <span className="kpi-icon">{c.icon}</span>
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-value">{loading ? "…" : fmt(kpi[c.key], c.fmt)}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="section-title">Top Campaigns by Spend</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th className="num-cell">Spend</th>
                <th className="num-cell">Impressions</th>
                <th className="num-cell">Clicks</th>
                <th className="num-cell">CTR</th>
                <th className="num-cell">Conversions</th>
                <th className="num-cell">Cost/Conv</th>
                <th className="num-cell">Search IS</th>
              </tr>
            </thead>
            <tbody>
              {topCampaigns.length > 0 ? (
                topCampaigns.map((row) => (
                  <tr key={row.campaign_id}>
                    <td>{row.name}</td>
                    <td>
                      <span className="geo-tag secondary">{row.status}</span>
                    </td>
                    <td className="num-cell accent">{fmtMoney(row.spend)}</td>
                    <td className="num-cell">{fmtNum(row.impressions)}</td>
                    <td className="num-cell">{fmtNum(row.clicks)}</td>
                    <td className="num-cell">{fmtPct(row.ctr)}</td>
                    <td className="num-cell">{fmtNum(row.conversions)}</td>
                    <td className="num-cell">{row.conversions > 0 ? fmtMoney(row.costPerConv) : "—"}</td>
                    <td className="num-cell">{fmtPct(row.searchIS)}</td>
                  </tr>
                ))
              ) : (
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