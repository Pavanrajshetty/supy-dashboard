import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../lib/supabase";

// Inlined design tokens to avoid any theme.js path resolution issues
const colors = {
  green: "#1f8f5f",
  greenDark: "#166b47",
  red: "#d64545",
  redDark: "#a83333",
  accent: "#d4a62a",
  textPrimary: "#2f2350",
  textMuted: "#6f6784",
  surfaceAlt: "#f8f5fc",
  border: "#e7deef",
};

const radius = {
  sm: "6px",
  pill: "999px",
};

const fontSizeSm = "11px";

const TIER_LABELS = {
  A_semantic: "Semantic mismatch",
  B_performance: "Performance (0 conv)",
};

const TIER_COLORS = {
  A_semantic: colors.red,
  B_performance: colors.accent,
};

function fmtMoney(v) {
  return `$${Number(v || 0).toFixed(2)}`;
}

function fmtNum(v) {
  return Math.round(Number(v || 0)).toLocaleString();
}

function last7Key(searchTerm, campaignId, adGroupId) {
  return `${searchTerm}|${campaignId}|${adGroupId}`;
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

const thStyle = {
  textAlign: "center",
  whiteSpace: "nowrap",
};

const ActionButton = ({ variant, disabled, onClick, children }) => {
  const isApprove = variant === "approve";
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        background: isApprove ? colors.green : "#fff",
        color: isApprove ? "#fff" : colors.red,
        border: isApprove ? "none" : `1.5px solid ${colors.red}`,
        borderRadius: radius.pill,
        padding: "8px 18px",
        fontSize: "12.5px",
        fontWeight: 700,
        letterSpacing: "0.2px",
        cursor: disabled ? "wait" : "pointer",
        opacity: disabled ? 0.55 : 1,
        whiteSpace: "nowrap",
        minWidth: isApprove ? "88px" : "76px",
        boxShadow: isApprove
          ? "0 1px 3px rgba(31,143,95,0.35)"
          : "0 1px 2px rgba(214,69,69,0.12)",
        transition: "transform 0.05s ease",
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
};

export default function GoogleAdsNegativeKeywords() {
  const [rows, setRows] = useState([]);
  const [last7Map, setLast7Map] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tierFilter, setTierFilter] = useState("ALL");
  const [busyIds, setBusyIds] = useState({});
  const [actionError, setActionError] = useState(null);

  const loadPending = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const logRows = await fetchAllRows(() =>
        supabase
          .from("google_ads_neg_keyword_review_log")
          .select(
            "id, search_term, campaign_id, campaign_name, ad_group_id, ad_group_name, matched_keyword_text, tier, reason, clicks, cost, conversions, first_flagged_date, times_suggested, suggested_scope"
          )
          .eq("status", "pending")
          .order("campaign_name", { ascending: true })
      );

      setRows(logRows);

      if (logRows.length > 0) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysStr = sevenDaysAgo.toISOString().slice(0, 10);

        const dailyRows = await fetchAllRows(() =>
          supabase
            .from("google_ads_search_terms_daily")
            .select("search_term, campaign_id, ad_group_id, impressions, clicks")
            .gte("date", sevenDaysStr)
        );

        const map = {};
        dailyRows.forEach((r) => {
          const key = last7Key(r.search_term, r.campaign_id, r.ad_group_id);
          if (!map[key]) map[key] = { impressions: 0, clicks: 0 };
          map[key].impressions += Number(r.impressions || 0);
          map[key].clicks += Number(r.clicks || 0);
        });
        setLast7Map(map);
      } else {
        setLast7Map({});
      }
    } catch (err) {
      console.error("Negative keyword fetch error:", err);
      setError(err.message || "Failed to load suggestions");
      setRows([]);
      setLast7Map({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const filteredRows = useMemo(() => {
    if (tierFilter === "ALL") return rows;
    return rows.filter((r) => r.tier === tierFilter);
  }, [rows, tierFilter]);

  const grouped = useMemo(() => {
    const byCampaign = {};
    filteredRows.forEach((r) => {
      const cKey = r.campaign_name || `Campaign ${r.campaign_id}`;
      const agKey = r.ad_group_name || `Ad group ${r.ad_group_id}`;
      byCampaign[cKey] ??= {};
      byCampaign[cKey][agKey] ??= [];
      byCampaign[cKey][agKey].push(r);
    });
    return byCampaign;
  }, [filteredRows]);

  const setBusy = (id, val) =>
    setBusyIds((prev) => ({ ...prev, [id]: val }));

  const handleReject = async (row) => {
    setBusy(row.id, true);
    setActionError(null);
    try {
      const cooldownDate = new Date();
      cooldownDate.setDate(cooldownDate.getDate() + 3);
      const cooldownStr = cooldownDate.toISOString().slice(0, 10);

      const { error: updateError } = await supabase
        .from("google_ads_neg_keyword_review_log")
        .update({
          status: "rejected",
          cooldown_until: cooldownStr,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (updateError) throw updateError;

      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      console.error("Reject error:", err);
      setActionError(`Failed to reject "${row.search_term}": ${err.message}`);
    } finally {
      setBusy(row.id, false);
    }
  };

  const handleApprove = async (row) => {
    setBusy(row.id, true);
    setActionError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "approve-negative-keyword",
        { body: { review_log_id: row.id } }
      );

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      console.error("Approve error:", err);
      setActionError(
        `Failed to approve "${row.search_term}": ${err.message}. The Google Ads write did not go through — nothing was changed.`
      );
    } finally {
      setBusy(row.id, false);
    }
  };

  const tierBadge = (tier) => (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: radius.sm,
        fontSize: "11px",
        fontWeight: 600,
        color: "#fff",
        background: TIER_COLORS[tier] || colors.textMuted,
        whiteSpace: "nowrap",
      }}
    >
      {TIER_LABELS[tier] || tier}
    </span>
  );

  const totalPending = rows.length;

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">AI Google Ads — Negative Keyword Review</h2>
      </div>

      <div className="filter-bar">
        <button
          className={`filter-pill ${tierFilter === "ALL" ? "active" : ""}`}
          onClick={() => setTierFilter("ALL")}
        >
          All ({totalPending})
        </button>
        <button
          className={`filter-pill ${tierFilter === "A_semantic" ? "active" : ""}`}
          onClick={() => setTierFilter("A_semantic")}
        >
          Semantic mismatch ({rows.filter((r) => r.tier === "A_semantic").length})
        </button>
        <button
          className={`filter-pill ${tierFilter === "B_performance" ? "active" : ""}`}
          onClick={() => setTierFilter("B_performance")}
        >
          Performance ({rows.filter((r) => r.tier === "B_performance").length})
        </button>
        <button className="filter-pill" onClick={loadPending} style={{ marginLeft: "auto" }}>
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="card" style={{ color: colors.red }}>
          ⚠️ {error}
        </div>
      )}

      {actionError && (
        <div className="card" style={{ color: colors.red }}>
          ⚠️ {actionError}
        </div>
      )}

      {loading && <div className="card">Loading suggestions...</div>}

      {!loading && totalPending === 0 && !error && (
        <div className="card" style={{ textAlign: "center", padding: "32px", color: colors.textMuted }}>
          🎉 Nothing pending review right now.
        </div>
      )}

      {Object.entries(grouped).map(([campaignName, adGroups]) => (
        <div className="card" key={campaignName}>
          <h3 className="section-title">{campaignName}</h3>

          {Object.entries(adGroups).map(([adGroupName, terms]) => (
            <div key={adGroupName} style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: fontSizeSm,
                  color: colors.textMuted,
                  marginBottom: "6px",
                  fontWeight: 600,
                }}
              >
                Ad group: {adGroupName}
              </div>

              <div className="table-wrap" style={{ overflowX: "auto" }}>
                <table
                  className="data-table"
                  style={{ tableLayout: "fixed", width: "100%", minWidth: "1300px" }}
                >
                  <colgroup>
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "27%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "10%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={thStyle}>Search term</th>
                      <th style={thStyle}>Tier</th>
                      <th style={thStyle}>Impr (7d)</th>
                      <th style={thStyle}>Clicks (7d)</th>
                      <th style={thStyle}>Clicks</th>
                      <th style={thStyle}>Cost</th>
                      <th style={thStyle}>Conv</th>
                      <th style={thStyle}>Reason</th>
                      <th style={thStyle}>Scope</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {terms.map((row) => {
                      const key = last7Key(row.search_term, row.campaign_id, row.ad_group_id);
                      const last7 = last7Map[key] || { impressions: 0, clicks: 0 };
                      return (
                        <tr key={row.id}>
                          <td
                            style={{
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                              textAlign: "right",
                              verticalAlign: "top",
                              padding: "10px 8px",
                            }}
                          >
                            <strong>{row.search_term}</strong>
                            {row.times_suggested > 1 && (
                              <div style={{ fontSize: "11px", color: colors.textMuted }}>
                                Suggested {row.times_suggested}× (first flagged {row.first_flagged_date})
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: "center", verticalAlign: "top" }}>
                            {tierBadge(row.tier)}
                          </td>
                          <td className="num-cell" style={{ textAlign: "center", verticalAlign: "top" }}>
                            {fmtNum(last7.impressions)}
                          </td>
                          <td className="num-cell" style={{ textAlign: "center", verticalAlign: "top" }}>
                            {fmtNum(last7.clicks)}
                          </td>
                          <td className="num-cell" style={{ textAlign: "center", verticalAlign: "top" }}>
                            {fmtNum(row.clicks)}
                          </td>
                          <td className="num-cell" style={{ textAlign: "center", verticalAlign: "top" }}>
                            {fmtMoney(row.cost)}
                          </td>
                          <td className="num-cell" style={{ textAlign: "center", verticalAlign: "top" }}>
                            {fmtNum(row.conversions)}
                          </td>
                          <td
                            style={{
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                              fontSize: "12px",
                              color: colors.textMuted,
                              lineHeight: 1.5,
                              verticalAlign: "top",
                              padding: "10px 8px",
                              textAlign: "left",
                            }}
                          >
                            {row.reason}
                          </td>
                          <td style={{ textAlign: "center", verticalAlign: "top" }}>
                            <span className="geo-tag secondary">{row.suggested_scope}</span>
                          </td>
                          <td style={{ verticalAlign: "top", padding: "10px 6px" }}>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px",
                                alignItems: "center",
                              }}
                            >
                              <ActionButton
                                variant="approve"
                                disabled={busyIds[row.id]}
                                onClick={() => handleApprove(row)}
                              >
                                {busyIds[row.id] ? "..." : "✓ Approve"}
                              </ActionButton>
                              <ActionButton
                                variant="reject"
                                disabled={busyIds[row.id]}
                                onClick={() => handleReject(row)}
                              >
                                ✕ Reject
                              </ActionButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
