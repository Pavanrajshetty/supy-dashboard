import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

/* =========================
   HELPERS
========================= */

const FLAG_MAP = {
  Australia: "🇦🇺",
  "United Kingdom": "🇬🇧",
  "New Zealand": "🇳🇿",
  Malaysia: "🇲🇾",
  "United Arab Emirates": "🇦🇪",
  "Hong Kong": "🇭🇰",
  Singapore: "🇸🇬",
  Philippines: "🇵🇭",
  "Saudi Arabia": "🇸🇦",
  Morocco: "🇲🇦",
  Thailand: "🇹🇭",
  Oman: "🇴🇲",
  Ireland: "🇮🇪",
  Kuwait: "🇰🇼",
  Taiwan: "🇹🇼",
  Mauritius: "🇲🇺",
  "South Africa": "🇿🇦",
  "Sri Lanka": "🇱🇰",
  Italy: "🇮🇹",
  Bahrain: "🇧🇭",
};

const ISO_TO_COUNTRY = {
  AU: "Australia",
  GB: "United Kingdom",
  NZ: "New Zealand",
  MY: "Malaysia",
  AE: "United Arab Emirates",
  HK: "Hong Kong",
  SG: "Singapore",
  PH: "Philippines",
  SA: "Saudi Arabia",
  MA: "Morocco",
  TH: "Thailand",
  OM: "Oman",
  IE: "Ireland",
  KW: "Kuwait",
  TW: "Taiwan",
  MU: "Mauritius",
  ZA: "South Africa",
  LK: "Sri Lanka",
  IT: "Italy",
  BH: "Bahrain",
};

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtAED(value) {
  return `AED ${Number(value || 0).toLocaleString(undefined, {
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

function pctDelta(expected, actual) {
  if (!expected) return 0;
  return Math.round(((safeNum(actual) - safeNum(expected)) / safeNum(expected)) * 100);
}

function varianceLabel(expected, actual) {
  const val = pctDelta(expected, actual);
  return `${val > 0 ? "+" : ""}${val}%`;
}

function getDeltaClass(value) {
  if (value > 0) return "delta-pos";
  if (value < 0) return "delta-neg";
  return "delta-neutral";
}

function getStatusClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "scaling") return "pill scaling";
  if (s === "reduced") return "pill reduced";
  if (s === "paused") return "pill paused";
  return "pill stable";
}

function safeDivide(a, b) {
  if (!b) return 0;
  return safeNum(a) / safeNum(b);
}

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function getEndExclusive(date) {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d;
}

function getLiveRange() {
  const now = new Date();

  // always use last completed day
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() - 1);

  // if today is Apr 1, endDate becomes Mar 31 automatically
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  return { startDate, endDate };
}

function monthLabel(date) {
  return date.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getPlanMonth(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function normalizeGeo(value) {
  if (!value) return null;
  return ISO_TO_COUNTRY[value] || value;
}

function buildSummaryNote(totals) {
  const spendPct = totals.liveBudget
    ? Math.round((totals.actualSpend / totals.liveBudget) * 100)
    : 0;
  const mqlPct = totals.liveMql
    ? Math.round((totals.actualMql / totals.liveMql) * 100)
    : 0;
  const sqlPct = totals.liveSql
    ? Math.round((totals.actualSql / totals.liveSql) * 100)
    : 0;

  return `Spend is at ${spendPct}% of live plan, MQL is at ${mqlPct}% of live plan, and SQL is at ${sqlPct}% of live plan for the selected MTD window.`;
}

/* =========================
   COMPONENT
========================= */

export default function MTDData() {
  const [{ startDate, endDate }] = useState(getLiveRange());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const startDateStr = useMemo(() => toISODate(startDate), [startDate]);
  const endDateStr = useMemo(() => toISODate(endDate), [endDate]);
  const endExclusiveStr = useMemo(() => toISODate(getEndExclusive(endDate)), [endDate]);
  const selectedMonth = useMemo(() => getPlanMonth(endDate), [endDate]);
  const selectedMonthLabel = useMemo(() => monthLabel(endDate), [endDate]);

  useEffect(() => {
    async function fetchLiveMTD() {
      try {
        setLoading(true);
        setError("");

        const [
          planMonthlyRes,
          planDailyRes,
          spendRes,
          mqlRes,
          sqlRes,
        ] = await Promise.all([
          supabase
            .from("plan_monthly")
            .select("geo, spend_budget_usd, mql_target, sql_target")
            .eq("plan_month", selectedMonth),

          supabase
            .from("plan_daily")
            .select("geo, plan_date, daily_spend_usd, daily_mql_target, status")
            .gte("plan_date", startDateStr)
            .lte("plan_date", endDateStr),

          supabase
            .from("meta_performance")
            .select("country, country_name, spend_usd, perf_date")
            .gte("perf_date", startDateStr)
            .lt("perf_date", endExclusiveStr),

          supabase
            .from("master_leads")
            .select("country, lead_created_date")
            .gte("lead_created_date", startDateStr)
            .lt("lead_created_date", endExclusiveStr),

          supabase
            .from("master_leads")
            .select("country, sql_date, amount_usd, is_sql")
            .eq("is_sql", true)
            .gte("sql_date", startDateStr)
            .lt("sql_date", endExclusiveStr),
        ]);

        const errors = [
          planMonthlyRes.error,
          planDailyRes.error,
          spendRes.error,
          mqlRes.error,
          sqlRes.error,
        ].filter(Boolean);

        if (errors.length) {
          throw new Error(errors.map((e) => e.message).join(" | "));
        }

        const planMonthly = planMonthlyRes.data || [];
        const planDaily = planDailyRes.data || [];
        const spendRows = spendRes.data || [];
        const mqlRows = mqlRes.data || [];
        const sqlRows = sqlRes.data || [];

        const daysInMonth = new Date(
          endDate.getFullYear(),
          endDate.getMonth() + 1,
          0
        ).getDate();

        const geoMap = new Map();

        // base from monthly plan
        planMonthly.forEach((row) => {
          const geo = normalizeGeo(row.geo);
          geoMap.set(geo, {
            geo,
            flag: FLAG_MAP[geo] || "",
            mopBudget: safeNum(row.spend_budget_usd),
            liveBudget: 0,
            actualSpend: 0,
            mopMql: safeNum(row.mql_target),
            liveMql: 0,
            actualMql: 0,
            mopSql: safeNum(row.sql_target),
            liveSql: 0,
            actualSql: 0,
            pipeline: 0,
            status: "Stable",
            reason: "",
            latestDailySpend: 0,
            latestStatus: "active",
          });
        });

        // live plan from plan_daily
        const latestPerGeo = new Map();

        planDaily.forEach((row) => {
          const geo = normalizeGeo(row.geo);
          if (!geoMap.has(geo)) {
            geoMap.set(geo, {
              geo,
              flag: FLAG_MAP[geo] || "",
              mopBudget: 0,
              liveBudget: 0,
              actualSpend: 0,
              mopMql: 0,
              liveMql: 0,
              actualMql: 0,
              mopSql: 0,
              liveSql: 0,
              actualSql: 0,
              pipeline: 0,
              status: "Stable",
              reason: "",
              latestDailySpend: 0,
              latestStatus: "active",
            });
          }

          const entry = geoMap.get(geo);
          entry.liveBudget += safeNum(row.daily_spend_usd);
          entry.liveMql += safeNum(row.daily_mql_target);

          const currentLatest = latestPerGeo.get(geo);
          if (!currentLatest || row.plan_date > currentLatest.plan_date) {
            latestPerGeo.set(geo, row);
          }
        });

        // derive live SQL + status
        geoMap.forEach((entry, geo) => {
          entry.liveSql = Number(
            ((safeNum(entry.mopSql) / daysInMonth) * endDate.getDate()).toFixed(2)
          );

          const latest = latestPerGeo.get(geo);
          const baseDaily = daysInMonth ? safeNum(entry.mopBudget) / daysInMonth : 0;
          const latestDaily = latest ? safeNum(latest.daily_spend_usd) : 0;
          const latestStatus = latest ? String(latest.status || "active").toLowerCase() : "active";

          entry.latestDailySpend = latestDaily;
          entry.latestStatus = latestStatus;

          if (latestStatus === "paused") {
            entry.status = "Paused";
            entry.reason = "Paused in live plan";
          } else if (latestDaily > baseDaily * 1.02) {
            entry.status = "Scaling";
            entry.reason = "Daily budget increased vs MOP";
          } else if (latestDaily < baseDaily * 0.98) {
            entry.status = "Reduced";
            entry.reason = "Daily budget reduced vs MOP";
          } else {
            entry.status = "Stable";
            entry.reason = "Tracking near original plan";
          }
        });

        // actual spend from meta_performance
        spendRows.forEach((row) => {
          const geo = normalizeGeo(row.country_name || row.country);
          if (!geoMap.has(geo)) {
            geoMap.set(geo, {
              geo,
              flag: FLAG_MAP[geo] || "",
              mopBudget: 0,
              liveBudget: 0,
              actualSpend: 0,
              mopMql: 0,
              liveMql: 0,
              actualMql: 0,
              mopSql: 0,
              liveSql: 0,
              actualSql: 0,
              pipeline: 0,
              status: "Stable",
              reason: "",
              latestDailySpend: 0,
              latestStatus: "active",
            });
          }
          geoMap.get(geo).actualSpend += safeNum(row.spend_usd);
        });

        // actual MQL from master_leads lead_created_date
        mqlRows.forEach((row) => {
          const geo = normalizeGeo(row.country);
          if (!geoMap.has(geo)) {
            geoMap.set(geo, {
              geo,
              flag: FLAG_MAP[geo] || "",
              mopBudget: 0,
              liveBudget: 0,
              actualSpend: 0,
              mopMql: 0,
              liveMql: 0,
              actualMql: 0,
              mopSql: 0,
              liveSql: 0,
              actualSql: 0,
              pipeline: 0,
              status: "Stable",
              reason: "",
              latestDailySpend: 0,
              latestStatus: "active",
            });
          }
          geoMap.get(geo).actualMql += 1;
        });

        // actual SQL + pipeline from master_leads sql_date
        sqlRows.forEach((row) => {
          const geo = normalizeGeo(row.country);
          if (!geoMap.has(geo)) {
            geoMap.set(geo, {
              geo,
              flag: FLAG_MAP[geo] || "",
              mopBudget: 0,
              liveBudget: 0,
              actualSpend: 0,
              mopMql: 0,
              liveMql: 0,
              actualMql: 0,
              mopSql: 0,
              liveSql: 0,
              actualSql: 0,
              pipeline: 0,
              status: "Stable",
              reason: "",
              latestDailySpend: 0,
              latestStatus: "active",
            });
          }
          const entry = geoMap.get(geo);
          entry.actualSql += 1;
          entry.pipeline += safeNum(row.amount_usd);
        });

        const finalRows = Array.from(geoMap.values())
          .map((row) => ({
            ...row,
            liveBudget: Number(row.liveBudget.toFixed(2)),
            actualSpend: Number(row.actualSpend.toFixed(2)),
            liveMql: Number(row.liveMql.toFixed(2)),
            liveSql: Number(row.liveSql.toFixed(2)),
            pipeline: Number(row.pipeline.toFixed(2)),
          }))
          .sort((a
