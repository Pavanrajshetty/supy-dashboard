import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";

const RANGE_DAYS = { "7d": 7, "30d": 30, "60d": 60, "90d": 90, all: null };
const RANGE_LABELS = { "7d": "Last 7d", "30d": "Last 30d", "60d": "Last 60d", "90d": "Last 90d", all: "All time" };

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

function getStartDate(rangeKey) {
  const days = RANGE_DAYS[rangeKey];
  if (days === null) return null;
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

export default function GoogleAdsCampaigns() {
  const [range, setRange] = useState("30d");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [campaignDaily, setCampaignDaily] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("spend");
  const [sortDir, setSortDir] = useState("desc");

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
              .select("campaign_id, date, impressions, clicks, cost, conversions, conversion_value, search_impression_share, search_lost_is_budget, search_lost_is_rank");
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
        console.error("Google Ads campaigns fetch error:", err);
        setError(err.message || "Failed to load campaign data");
        setCampaignDaily([]);
        setCampaigns([]);
      } finally {
        if (isActive) setLoading(false);
      }
    }

    fetchData();
    return () => { isActive = false; };
  }, [range]);

  const campaignMap = useMemo(() => {
    const m = {};
    campaigns.forEach((c) => { m[c.campaign_id] = c; });
    return m;
  }, [campaigns]);

  const statuses = useMemo(() => {
    return ["ALL", ...new Set(campaigns.map((c) => c.status).filter(Boolean))];
  }, [campaigns]);

  const campaignRows = useMemo(() => {
    const byCampaign = {};

    campaignDaily.forEach((r) => {
      if (!byCampaign[r.campaign_id]) {
        byCampaign[r.campaign_id] = {
          campaign_id: r.campaign_id,
          spend: 0, impressions: 0, clicks: 0, conversions: 0, pipeline: 0,
          isWeightSum: 0, lostBudgetWeightSum: 0, lostRankWeightSum: 0, isWeightTotal: 0,
        };
      }
      const b = byCampaign[r.campaign_id];
      b.spend += safeNum(r.cost);
      b.impressions += safeNum(r.impressions);
      b.clicks += safeNum(r.clicks);
      b.conversions += safeNum(r.conversions);
      b.pipeline += safeNum(r.conversion_value);
      b.isWeightSum += safeNum(r.search_impression_share) * safeNum(r.impressions);
      b.lostBudgetWeightSum += safeNum(r.search_lost_is_budget) * safeNum(r.impressions);
      b.lostRankWeightSum += safeNum(r.search_lost_is_rank) * safeNum(r.impressions);
      b.isWeightTotal += safeNum(r.impressions);
    });

    let rows = Object.values(byCampaign).map((b) => {
      const dim = campaignMap[b.campaign_id];
      return {
        ...b,
        name: dim?.campaign_name || `Campaign ${b.campaign_id}`,
        status: dim?.status || "—",
        budget: safeNum(dim?.budget_amount),
        ctr: b.impressions > 0 ? b.clicks / b.impressions : 0,
        avgCpc: b.clicks > 0 ? b.spend / b.clicks : 0,
        costPerConv: b.conversions > 0 ? b.spend / b.conversions : 0,
        searchIS: b.isWeightTotal > 0 ? b.isWeightSum / b.isWeightTotal : 0,
        lostBudget: b.isWeightTotal > 0 ? b.lostBudgetWeightSum / b.isWeightTotal : 0,
        lostRank: b.isWeightTotal > 0 ? b.lostRankWeightSum / b.isWeightTotal : 0,
      };
    });

    if (statusFilter !== "ALL") {
      rows = rows.filter((r) => r.status === statusFilter);
    }

    rows.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return rows;
  }, [campaignDaily, campaignMap, statusFilter, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "status" ? "asc" : "desc");
    }
  };

  const SortTh = ({ k, label, className = "" }) => (
    <th onClick={() => handleSort(k)} className={`sortable-th ${className}`}>
      {label} {sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : ""}
    </th>
  );

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">Google Ads — Campaigns</h2>
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

      <div className="filter-bar" style={{ marginTop: 4 }}>
        <span className="filter-label">Status:</span>
        {statuses.map((s) => (
          <button
            key={s}
            className={`filter-pill ${statusFilter === s ? "active" : ""}`}
            onClick={() => setStatusFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="card" style={{ color: "#d64545" }}>
          ⚠️ {error}
        </div>
      )}

      <div className="card">
        <h3 className="section-title">Campaigns ({campaignRows.length})</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <SortTh k="name" label="Campaign" />
                <SortTh k="status" label="Status" />
                <SortTh k="budget" label="Budget" className="num-cell" />
                <SortTh k="spend" label="Spend" className="num-cell" />
                <SortTh k="clicks" label="Clicks" className="num-cell" />
                <SortTh k="ctr" label="CTR" className="num-cell" />
                <SortTh k="avgCpc" label="Avg CPC" className="num-cell" />
                <SortTh k="conversions" label="Conversions" className="num-cell" />
                <SortTh k="costPerConv" label="Cost/Conv" className="num-cell" />
                <SortTh k="searchIS" label="Search IS" className="num-cell" />
                <SortTh k="lostBudget" label="Lost (Budget)" className="num-cell" />
                <SortTh k="lostRank" label="Lost (Rank)" className="num-cell" />
              </tr>
            </thead>
            <tbody>
              {campaignRows.length > 0 ? (
                campaignRows.map((row) => (
                  <tr key={row.campaign_id}>
                    <td>{row.name}</td>
                    <td>
                      <span className="geo-tag secondary">{row.status}</span>
                    </td>
                    <td className="num-cell dim">{row.budget > 0 ? fmtMoney(row.budget) + "/d" : "—"}</td>
                    <td className="num-cell accent">{fmtMoney(row.spend)}</td>
                    <td className="num-cell">{fmtNum(row.clicks)}</td>
                    <td className="num-cell">{fmtPct(row.ctr)}</td>
                    <td className="num-cell">{fmtMoney(row.avgCpc)}</td>
                    <td className="num-cell">{fmtNum(row.conversions)}</td>
                    <td className="num-cell">{row.conversions > 0 ? fmtMoney(row.costPerConv) : "—"}</td>
                    <td className="num-cell">{fmtPct(row.searchIS)}</td>
                    <td className="num-cell">{fmtPct(row.lostBudget)}</td>
                    <td className="num-cell">{fmtPct(row.lostRank)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="12" className="num-cell">
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