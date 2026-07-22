import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const ASSET_KIND_LABEL = {
  HEADLINE: "Headline",
  DESCRIPTION: "Description",
  SITELINK: "Sitelink",
  CALLOUT: "Callout",
  STRUCTURED_SNIPPET: "Structured Snippet",
};

const ACTION_STYLE = {
  REMOVE: { bg: "#fff1f0", color: "#cf1322", label: "Remove" },
  ADD: { bg: "#e8faf0", color: "#1a8a5c", label: "Add" },
  REPLACE: { bg: "#e6f4ff", color: "#096dd9", label: "Replace" },
};

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtPct(v) {
  return `${safeNum(v).toFixed(1)}%`;
}

function fmtDeltaPp(v) {
  if (v === null || v === undefined) return "—";
  const n = safeNum(v);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}pp`;
}

function fmtNum(v) {
  return Math.round(safeNum(v)).toLocaleString();
}

function fmtMoney(v) {
  return `$${Math.round(safeNum(v)).toLocaleString()}`;
}

function ActionBadge({ action }) {
  const s = ACTION_STYLE[action] || ACTION_STYLE.REPLACE;
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {s.label}
    </span>
  );
}

function SuggestionCard({ row, onDecision, busy }) {
  const isBusy = busy === row.id;

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: "18px 20px",
        border: "1.5px solid #e8e4f5",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: "0 2px 8px rgba(80,51,144,0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
            <ActionBadge action={row.action} />
            <span className="geo-tag secondary">{ASSET_KIND_LABEL[row.asset_kind] || row.asset_kind}</span>
            {row.trend_classification && (
              <span className="geo-tag secondary" style={{ fontStyle: "italic" }}>
                {row.trend_classification}
              </span>
            )}
          </div>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#321e57" }}>
            {row.campaign_name || `Campaign ${row.campaign_id}`}
            {row.ad_group_name ? ` · ${row.ad_group_name}` : ""}
          </div>
          {row.geo_targeting && (
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>🌏 {row.geo_targeting}</div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            className="filter-pill"
            style={{ background: "#e8faf0", color: "#1a8a5c", fontWeight: 700, border: "none" }}
            disabled={isBusy}
            onClick={() => onDecision(row.id, "approve")}
          >
            {isBusy ? "…" : "✓ Approve"}
          </button>
          <button
            className="filter-pill"
            style={{ background: "#fff1f0", color: "#cf1322", fontWeight: 700, border: "none" }}
            disabled={isBusy}
            onClick={() => onDecision(row.id, "reject")}
          >
            {isBusy ? "…" : "✗ Reject"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {row.current_text && (
          <div style={{ background: "#fff1f0", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#cf1322", marginBottom: 4 }}>
              CURRENT
            </div>
            <div style={{ fontSize: 13, color: "#374151" }}>{row.current_text}</div>
          </div>
        )}
        {row.suggested_text && (
          <div style={{ background: "#e8faf0", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#1a8a5c", marginBottom: 4 }}>
              SUGGESTED
            </div>
            <div style={{ fontSize: 13, color: "#374151" }}>{row.suggested_text}</div>
          </div>
        )}
      </div>

      <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
        <span style={{ fontWeight: 600, color: "#374151" }}>Why: </span>
        {row.reason}
        {row.based_on_pattern && (
          <>
            <br />
            <span style={{ fontWeight: 600, color: "#374151" }}>Pattern: </span>
            {row.based_on_pattern}
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", paddingTop: 8, borderTop: "1px solid #f3f4f6" }}>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          <span style={{ fontWeight: 600, color: "#6b7280" }}>Baseline CTR: </span>
          {fmtPct(row.baseline_ctr)}
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          <span style={{ fontWeight: 600, color: "#6b7280" }}>Current CTR: </span>
          {fmtPct(row.current_ctr)}
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          <span style={{ fontWeight: 600, color: "#6b7280" }}>Δ: </span>
          {fmtDeltaPp(row.delta_pp)}
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          <span style={{ fontWeight: 600, color: "#6b7280" }}>Impr / Clicks: </span>
          {fmtNum(row.window_impressions)} / {fmtNum(row.window_clicks)}
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          <span style={{ fontWeight: 600, color: "#6b7280" }}>Cost: </span>
          {fmtMoney(row.window_cost)}
        </div>
        {row.times_suggested > 1 && (
          <div style={{ fontSize: 11, color: "#d46b08" }}>
            <span style={{ fontWeight: 600 }}>Resurfaced: </span>
            {row.times_suggested}×
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoogleAdsAssetReview() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);
  const [assetKindFilter, setAssetKindFilter] = useState("ALL");

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const { data, error: fetchError } = await supabase
        .from("google_ads_asset_review_log")
        .select("*")
        .eq("status", "pending")
        .order("suggested_date", { ascending: false });

      if (fetchError) throw fetchError;
      setRows(data || []);
    } catch (err) {
      console.error("Error fetching asset review queue:", err);
      setError(err?.message || "Failed to load review queue");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleDecision = async (reviewLogId, decision) => {
    setBusyId(reviewLogId);
    setToast(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "approve-reject-asset-suggestion",
        { body: { review_log_id: reviewLogId, decision } },
      );

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setToast({
        type: "success",
        message: decision === "approve" ? "Approved and pushed live." : "Rejected — won't be suggested again.",
      });
      setRows((prev) => prev.filter((r) => r.id !== reviewLogId));
    } catch (err) {
      console.error("Decision error:", err);
      setToast({ type: "error", message: err?.message || `Failed to ${decision}` });
    } finally {
      setBusyId(null);
    }
  };

  const assetKinds = ["ALL", ...new Set(rows.map((r) => r.asset_kind).filter(Boolean))];
  const displayRows = assetKindFilter === "ALL" ? rows : rows.filter((r) => r.asset_kind === assetKindFilter);

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Google Ads — Asset Suggestions</h2>
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
            Weekly Claude review · approve pushes live via Google Ads API, reject blocks it forever
          </p>
        </div>
        <span className="page-sub">{displayRows.length} pending</span>
      </div>

      {toast && (
        <div
          style={{
            background: toast.type === "success" ? "#e8faf0" : "#fff1f0",
            border: `1px solid ${toast.type === "success" ? "#95de64" : "#ffa39e"}`,
            color: toast.type === "success" ? "#1a8a5c" : "#cf1322",
            padding: "10px 16px",
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {toast.message}
        </div>
      )}

      {error && (
        <div className="card" style={{ color: "#d64545" }}>
          ⚠️ {error}
        </div>
      )}

      <div className="filter-bar" style={{ marginBottom: 20 }}>
        {assetKinds.map((k) => (
          <button
            key={k}
            className={`filter-pill ${assetKindFilter === k ? "active" : ""}`}
            onClick={() => setAssetKindFilter(k)}
          >
            {k === "ALL" ? "All" : ASSET_KIND_LABEL[k] || k}
          </button>
        ))}
        <button className="filter-pill" onClick={fetchPending}>
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 80, color: "#9ca3af" }}>Loading suggestions...</div>
      ) : displayRows.length === 0 ? (
        <div
          style={{
            background: "#f9fafb",
            borderRadius: 12,
            padding: "32px",
            textAlign: "center",
            color: "#9ca3af",
            fontSize: 14,
          }}
        >
          No pending suggestions right now — the weekly routine will populate this once it has enough
          data to trend-classify assets.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {displayRows.map((row) => (
            <SuggestionCard key={row.id} row={row} onDecision={handleDecision} busy={busyId} />
          ))}
        </div>
      )}
    </div>
  );
}
