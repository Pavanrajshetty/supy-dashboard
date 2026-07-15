import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";

const RANGE_DAYS = { "7d": 7, "30d": 30, "60d": 60, "90d": 90, all: null };
const RANGE_LABELS = { "7d": "Last 7d", "30d": "Last 30d", "60d": "Last 60d", "90d": "Last 90d", all: "All time (slower)" };

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

export default function GoogleAdsSearchTerms() {
  const [range, setRange] = useState("30d");
  const [search, setSearch] = useState("");
  const [rawRows, setRawRows] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [adGroups, setAdGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("cost");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    let isActive = true;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const startDate = getStartDate(range);

        const [termRows, campaignRows, adGroupRows] = await Promise.all([
          fetchAllRows(() => {
            let q = supabase
              .from("google_ads_search_terms_daily")
              .select("search_term, campaign_id, ad_group_id, date, impressions, clicks, cost, conversions");
            if (startDate) q = q.gte("date", startDate);
            return q;
          }),
          supabase.from("google_ads_campaigns").select("campaign_id, campaign_name"),
          supabase.from("google_ads_ad_groups").select("ad_group_id, ad_group_name"),
        ]);

        if (!isActive) return;
        setRawRows(termRows);
        setCampaigns(campaignRows.data || []);
        setAdGroups(adGroupRows.data || []);
      } catch (err) {
        if (!isActive) return;
        console.error("Google Ads search terms fetch error:", err);
        setError(err.message || "Failed to load search terms data");
        setRawRows([]);
      } finally {
        if (isActive) setLoading(false);
      }
    }

    fetchData();
    return () => { isActive = false; };
  }, [range]);

  const campaignMap = useMemo(() => {
    const m = {};
    campaigns.forEach((c) => { m[c.campaign_id] = c.campaign_name; });
    return m;
  }, [campaigns]);

  const adGroupMap = useMemo(() => {
    const m = {};
    adGroups.forEach((a) => { m[a.ad_group_id] = a.ad_group_name; });
    return m;
  }, [adGroups]);

  const termRows = useMemo(() => {
    const byTerm = {};

    rawRows.forEach((r) => {
      const key = `${r.search_term}__${r.campaign_id}__${r.ad_group_id}`;
      if (!byTerm[key]) {
        byTerm[key] = {
          key,
          search_term: r.search_term,
          campaign_id: r.campaign_id,
          ad_group_id: r.ad_group_id,
          impressions: 0, clicks: 0, cost: 0, conversions: 0,
        };
      }
      const b = byTerm[key];
      b.impressions += safeNum(r.impressions);
      b.clicks += safeNum(r.clicks);
      b.cost += safeNum(r.cost);
      b.conversions += safeNum(r.conversions);
    });

    let rows = Object.values(byTerm).map((b) => ({
      ...b,
      campaignName: campaignMap[b.campaign_id] || `Campaign ${b.campaign_id}`,
      adGroupName: adGroupMap[b.ad_group_id] || `Ad Group ${b.ad_group_id}`,
      ctr: b.impressions > 0 ? b.clicks / b.impressions : 0,
      avgCpc: b.clicks > 0 ? b.cost / b.clicks : 0,
    }));

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.search_term?.toLowerCase().includes(q));
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
  }, [rawRows, campaignMap, adGroupMap, search, sortKey, sortDir]);

  const displayRows = termRows.slice(0, 500);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "search_term" || key === "campaignName" ? "asc" : "desc");
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
        <h2 className="page-title">Google Ads — Search Terms</h2>
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
        <input
          type="text"
          placeholder="Search terms…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="filter-pill"
          style={{ height: 34, minWidth: 220 }}
        />
      </div>

      {error && (
        <div className="card" style={{ color: "#d64545" }}>
          ⚠️ {error}
        </div>
      )}

      <div className="card">
        <h3 className="section-title">
          Search Terms ({termRows.length}{termRows.length > 500 ? ", showing top 500 by current sort" : ""})
        </h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <SortTh k="search_term" label="Search Term" />
                <SortTh k="campaignName" label="Campaign" />
                <th>Ad Group</th>
                <SortTh k="impressions" label="Impressions" className="num-cell" />
                <SortTh k="clicks" label="Clicks" className="num-cell" />
                <SortTh k="ctr" label="CTR" className="num-cell" />
                <SortTh k="avgCpc" label="Avg CPC" className="num-cell" />
                <SortTh k="cost" label="Cost" className="num-cell" />
                <SortTh k="conversions" label="Conversions" className="num-cell" />
              </tr>
            </thead>
            <tbody>
              {displayRows.length > 0 ? (
                displayRows.map((row) => (
                  <tr key={row.key}>
                    <td>{row.search_term}</td>
                    <td className="dim">{row.campaignName}</td>
                    <td className="dim">{row.adGroupName}</td>
                    <td className="num-cell">{fmtNum(row.impressions)}</td>
                    <td className="num-cell">{fmtNum(row.clicks)}</td>
                    <td className="num-cell">{fmtPct(row.ctr)}</td>
                    <td className="num-cell">{fmtMoney(row.avgCpc)}</td>
                    <td className="num-cell accent">{fmtMoney(row.cost)}</td>
                    <td className="num-cell">{fmtNum(row.conversions)}</td>
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