import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";

const OUTCOME_STYLE = {
  COMPLETED:   { bg: "#e8faf0", color: "#1a8a5c", label: "✓ Completed" },
  NO_SHOW:     { bg: "#fff1f0", color: "#cf1322", label: "✗ No Show"   },
  CANCELED:    { bg: "#fff7e6", color: "#d46b08", label: "⊘ Cancelled" },
  RESCHEDULED: { bg: "#e6f4ff", color: "#096dd9", label: "↺ Rescheduled" },
  SCHEDULED:   { bg: "#f0f5ff", color: "#2f54eb", label: "● Scheduled" },
  NONE:        { bg: "#f5f5f5", color: "#8c8c8c", label: "— Pending"   },
};

function OutcomeBadge({ outcome }) {
  const s = OUTCOME_STYLE[outcome] || OUTCOME_STYLE.NONE;
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 700
    }}>{s.label}</span>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function MeetingCard({ meeting, section }) {
  const isPast = section === "past";
  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      padding: "16px 20px",
      border: `1.5px solid ${isPast ? "#f0f0f0" : "#e8e4f5"}`,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      boxShadow: "0 2px 8px rgba(80,51,144,0.06)",
      transition: "box-shadow 0.2s",
    }}>
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#321e57" }}>
            {meeting.firstname} {meeting.lastname}
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
            {meeting.company || "—"}
          </div>
        </div>
        <OutcomeBadge outcome={meeting.outcome || "NONE"} />
      </div>

      {/* Meeting title */}
      <div style={{ fontSize: 13, color: "#503390", fontWeight: 600 }}>
        📋 {meeting.title || "—"}
      </div>

      {/* Dates */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          <span style={{ fontWeight: 600, color: "#374151" }}>Booked: </span>
          {formatDate(meeting.booked_on)}
        </div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          <span style={{ fontWeight: 600, color: "#374151" }}>Meeting: </span>
          {formatDate(meeting.meeting_for)} · {formatTime(meeting.meeting_for)}
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 6, borderTop: "1px solid #f3f4f6" }}>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>
          🌏 {meeting.country || "—"}
        </span>
        <a
          href={`https://app.hubspot.com/contacts/9423176/record/0-47/${meeting.meeting_id}`}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 11, color: "#6c3fc5", fontWeight: 700, textDecoration: "none" }}
        >
          View in HubSpot ↗
        </a>
      </div>
    </div>
  );
}

export default function MeetingsBooked() {
  const [allMeetings, setAllMeetings] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState("All");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch meetings joined with master_leads
        const { data, error } = await supabase
          .from("hubspot_meetings")
          .select(`
            meeting_id,
            contact_id,
            title,
            booked_on,
            meeting_for,
            meeting_end,
            outcome,
            source,
            master_leads (
              firstname,
              lastname,
              company,
              country,
              is_sql
            )
          `)
          .order("meeting_for", { ascending: true });

        if (error) throw error;

        // Flatten joined data
        const flat = (data || []).map(m => ({
          ...m,
          firstname: m.master_leads?.firstname || "",
          lastname:  m.master_leads?.lastname  || "",
          company:   m.master_leads?.company   || "",
          country:   m.master_leads?.country   || "",
          is_sql:    m.master_leads?.is_sql,
        }));

        setAllMeetings(flat);
      } catch (err) {
        console.error("Error fetching meetings:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const today     = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Section 1 — Yesterday's meetings
  const yesterdayMeetings = useMemo(() => {
    return allMeetings.filter(m => {
      if (!m.meeting_for) return false;
      const d = new Date(m.meeting_for);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === yesterday.getTime();
    });
  }, [allMeetings]);

  // Section 2 — Upcoming meetings (today onwards), one per lead (next upcoming)
  const upcomingMeetings = useMemo(() => {
    const future = allMeetings.filter(m => {
      if (!m.meeting_for) return false;
      return new Date(m.meeting_for) >= today;
    });

    // Apply filter
    let filtered = future;
    if (filter === "Tomorrow") {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(23, 59, 59);
      filtered = future.filter(m => {
        const d = new Date(m.meeting_for);
        return d >= tomorrow && d <= tomorrowEnd;
      });
    } else if (filter === "This Week") {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      filtered = future.filter(m => new Date(m.meeting_for) <= weekEnd);
    }

    // One per lead — keep only next upcoming meeting per contact
    const seen = new Set();
    const deduped = [];
    for (const m of filtered) {
      if (!seen.has(m.contact_id)) {
        seen.add(m.contact_id);
        deduped.push(m);
      }
    }
    return deduped;
  }, [allMeetings, filter]);

  if (loading) {
    return (
      <div className="page">
        <div style={{ textAlign: "center", padding: 80, color: "#9ca3af" }}>Loading meetings...</div>
      </div>
    );
  }

  return (
    <div className="page">

      {/* ── SECTION 1 — YESTERDAY ── */}
      <div style={{ marginBottom: 48 }}>
        <div className="page-header-row" style={{ marginBottom: 16 }}>
          <div>
            <h2 className="page-title">Yesterday's Meetings</h2>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
              {formatDate(yesterday)} — what happened
            </p>
          </div>
          <span className="page-sub">{yesterdayMeetings.length} meetings</span>
        </div>

        {yesterdayMeetings.length === 0 ? (
          <div style={{ background: "#f9fafb", borderRadius: 12, padding: "32px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
            No meetings were scheduled yesterday
          </div>
        ) : (
          <div className="meetings-grid">
            {yesterdayMeetings.map(m => (
              <MeetingCard key={m.meeting_id} meeting={m} section="past" />
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 2 — UPCOMING ── */}
      <div>
        <div className="page-header-row" style={{ marginBottom: 16 }}>
          <div>
            <h2 className="page-title">Upcoming Meetings</h2>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
              From today onwards · one per lead
            </p>
          </div>
          <span className="page-sub">{upcomingMeetings.length} meetings</span>
        </div>

        {/* Filters */}
        <div className="filter-bar" style={{ marginBottom: 20 }}>
          {["All", "Tomorrow", "This Week"].map(f => (
            <button
              key={f}
              className={`filter-pill ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >{f}</button>
          ))}
        </div>

        {upcomingMeetings.length === 0 ? (
          <div style={{ background: "#f9fafb", borderRadius: 12, padding: "32px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
            No upcoming meetings found
          </div>
        ) : (
          <div className="meetings-grid">
            {upcomingMeetings.map(m => (
              <MeetingCard key={m.meeting_id} meeting={m} section="upcoming" />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
