import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { resolveCountryName } from "../lib/geoTargetConstants";

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

export default function GoogleAdsGeo() {
  const [range, setRange] = useState("30d");
  const [geoDaily, setGeoDaily] = useState([]);
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

        const rows = await fetchAllRows(() => {
          let q = supabase
            .from("google_ads_geo_daily")
            .select("country, date, impressions, clicks, cost, conversions");
          if (startDate) q = q.gte("date", startDate);
          return q;
        });

        if (!isActive) return;
        setGeoDaily(rows);
      } catch (err) {
        if (!isActive) return;
        console.error("Google Ads geo fetch error:", err);
        setError(err.message || "Failed to load geo data");
        setGeoDaily([]);
      } finally {
        if (isActive) setLoading(false);
      }
    }

    fetchData();
    return () => { isActive = false; };
  }, [range]);

  const geoRows = useMemo(() => {
    const byCountry = {};

    geoDaily.forEach((r) => {
      const name = resolveCountryName(r.country);
      if (!byCountry[name]) {
        byCountry[name] = { country: name, spend: 0, impressions: 0, clicks: 0, conversions: 0 };
      }
      byCountry[name].spend += safeNum(r.cost);
      byCountry[name].impressions += safeNum(r.impressions);
      byCountry[name].clicks += safeNum(r.clicks);
      byCountry[name].conversions += safeNum(r.conversions);
    });

    const rows = Object.values(byCountry).map((r) => ({
      ...r,
      ctr: r.impressions > 0 ? r.clicks / r.impressions : 0,
      avgCpc: r.clicks > 0 ? r.spend / r.clicks : 0,
      costPerConv: r.conversions > 0 ? r.spend / r.conversions : 0,
    }));

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
  }, [geoDaily, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "country" ? "asc" : "desc");
    }
  };

  const SortTh = ({ k, label, className = "" }) => (
    <th onClick={() => handleSort(k)} className={`sortable-th ${className}`}>
      {label} {sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : ""}
    </th>
  );

  const totals = useMemo(() => {
    return geoRows.reduce(
      (acc, r) => {
        acc.spend += r.spend;
        acc.impressions += r.impressions;
        acc.clicks += r.clicks;
        acc.conversions += r.conversions;
        return acc;
      },
      { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
    );
  }, [geoRows]);

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">Google Ads — Geo Breakdown</h2>
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

      <div className="card">
        <h3 className="section-title">By Country ({geoRows.length})</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <SortTh k="country" label="Country" />
                <SortTh k="spend" label="Spend" className="num-cell" />
                <SortTh k="impressions" label="Impressions" className="num-cell" />
                <SortTh k="clicks" label="Clicks" className="num-cell" />
                <SortTh k="ctr" label="CTR" className="num-cell" />
                <SortTh k="avgCpc" label="Avg CPC" className="num-cell" />
                <SortTh k="conversions" label="Conversions" className="num-cell" />
                <SortTh k="costPerConv" label="Cost/Conv" className="num-cell" />
              </tr>
            </thead>
            <tbody>
              {geoRows.length > 0 ? (
                geoRows.map((row) => (
                  <tr key={row.country}>
                    <td>
                      <span className="geo-tag">{row.country}</span>
                    </td>
                    <td className="num-cell accent">{fmtMoney(row.spend)}</td>
                    <td className="num-cell">{fmtNum(row.impressions)}</td>
                    <td className="num-cell">{fmtNum(row.clicks)}</td>
                    <td className="num-cell">{fmtPct(row.ctr)}</td>
                    <td className="num-cell">{fmtMoney(row.avgCpc)}</td>
                    <td className="num-cell">{fmtNum(row.conversions)}</td>
                    <td className="num-cell">{row.conversions > 0 ? fmtMoney(row.costPerConv) : "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="num-cell">
                    {loading ? "Loading..." : "No data found"}
                  </td>
                </tr>
              )}
            </tbody>
            {geoRows.length > 0 && (
              <tfoot>
                <tr>
                  <td className="dim">Total</td>
                  <td className="num-cell strong">{fmtMoney(totals.spend)}</td>
                  <td className="num-cell strong">{fmtNum(totals.impressions)}</td>
                  <td className="num-cell strong">{fmtNum(totals.clicks)}</td>
                  <td className="num-cell">—</td>
                  <td className="num-cell">—</td>
                  <td className="num-cell strong">{fmtNum(totals.conversions)}</td>
                  <td className="num-cell">—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}