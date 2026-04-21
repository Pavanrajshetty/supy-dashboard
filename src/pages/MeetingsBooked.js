import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";

const OUTCOME_STYLE = {
  COMPLETED:   { bg: "#e8faf0", color: "#1a8a5c", label: "✓ Completed" },
  NO_SHOW:     { bg: "#fff1f0", color: "#cf1322", label: "✗ No Show" },
  CANCELED:    { bg: "#fff7e6", color: "#d46b08", label: "⊘ Cancelled" },
  CANCELLED:   { bg: "#fff7e6", color: "#d46b08", label: "⊘ Cancelled" },
  RESCHEDULED: { bg: "#e6f4ff", color: "#096dd9", label: "↺ Rescheduled" },
  SCHEDULED:   { bg: "#f0f5ff", color: "#2f54eb", label: "● Scheduled" },
  NONE:        { bg: "#f5f5f5", color: "#8c8c8c", label: "— Pending" },
};

function OutcomeBadge({ outcome }) {
  const key = (outcome || "NONE").toUpperCase();
  const s = OUTCOME_STYLE[key] || OUTCOME_STYLE.NONE;

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

function safeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(value) {
  const d = safeDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value) {
  const d = safeDate(value);
  if (!d) return "";
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Local day start to avoid timezone shifting bug
function startOfLocalDay(dateInput = new Date()) {
  const d = new Date(dateInput);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getMeetingDate(meeting) {
  return (
    meeting.meeting_for ||
    meeting.start_time ||
    meeting.meeting_date ||
    meeting.scheduled_for ||
    null
  );
}

function getContactId(meeting) {
  return (
    meeting.contact_id ||
    meeting.lead_id ||
    meeting.hs_contact_id ||
    meeting.contactId ||
    null
  );
}

function getMeetingId(meeting) {
  return (
    meeting.meeting_id ||
    meeting.id ||
    meeting.hs_meeting_id ||
    `${getContactId(meeting) || "no-contact"}-${getMeetingDate(meeting) || Math.random()}`
  );
}

function MeetingCard({ meeting, section }) {
  const isPast = section === "past";
  const meetingDate = getMeetingDate(meeting);
  const meetingId = getMeetingId(meeting);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: "16px 20px",
        border: `1.5px solid ${isPast ? "#f0f0f0" : "#e8e4f5"}`,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        boxShadow: "0 2px 8px rgba(80,51,144,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#321e57" }}>
            {`${meeting.firstname || ""} ${meeting.lastname || ""}`.trim() || "Unknown Contact"}
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
            {meeting.company || "—"}
          </div>
        </div>
        <OutcomeBadge outcome={meeting.outcome} />
      </div>

      <div style={{ fontSize: 13, color: "#503390", fontWeight: 600 }}>
        📋 {meeting.title || meeting.meeting_title || "—"}
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          <span style={{ fontWeight: 600, color: "#374151" }}>Booked: </span>
          {formatDate(meeting.booked_on || meeting.created_at)}
        </div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          <span style={{ fontWeight: 600, color: "#374151" }}>Meeting: </span>
          {formatDate(meetingDate)}{meetingDate ? ` · ${formatTime(meetingDate)}` : ""}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 6,
          borderTop: "1px solid #f3f4f6",
        }}
      >
        <span style={{ fontSize: 11, color: "#9ca3af" }}>
          🌏 {meeting.country || "—"}
        </span>

        {meetingId ? (
          <a
            href={`https://app.hubspot.com/contacts/9423176/record/0-47/${meetingId}`}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: 11,
              color: "#6c3fc5",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            View in HubSpot ↗
          </a>
        ) : (
          <span style={{ fontSize: 11, color: "#9ca3af" }}>No HubSpot link</span>
        )}
      </div>
    </div>
  );
}

export default function MeetingsBooked() {
  const [allMeetings, setAllMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setErrorMsg("");

      try {
        const { data, error } = await supabase
          .from("hubspot_meetings")
          .select("*")
          .order("meeting_for", { ascending: true });

        if (error) throw error;

        const meetings = Array.isArray(data) ? data : [];

        const contactIds = [
          ...new Set(
            meetings
              .map((m) => getContactId(m))
              .filter(Boolean)
              .map((v) => String(v))
          ),
        ];

        let leadsMap = {};

        if (contactIds.length > 0) {
          const { data: leads, error: leadsError } = await supabase
            .from("master_leads")
            .select("lead_id, firstname, lastname, company, country")
            .in("lead_id", contactIds);

          if (leadsError) {
            console.error("Error fetching master_leads:", leadsError);
          }

          (leads || []).forEach((lead) => {
            leadsMap[String(lead.lead_id)] = lead;
          });
        }

        const merged = meetings.map((meeting) => {
          const contactId = String(getContactId(meeting) || "");
          const lead = leadsMap[contactId] || {};

          return {
            ...meeting,
            firstname: meeting.firstname || lead.firstname || "",
            lastname: meeting.lastname || lead.lastname || "",
            company: meeting.company || lead.company || "",
            country: meeting.country || lead.country || "",
          };
        });

        console.log("RAW meetings:", meetings);
        console.log("MERGED meetings:", merged);

        setAllMeetings(merged);
      } catch (err) {
        console.error("Error fetching meetings:", err);
        setErrorMsg(err?.message || "Failed to load meetings");
        setAllMeetings([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const todayStart = useMemo(() => startOfLocalDay(new Date()), []);
  const tomorrowStart = useMemo(() => {
    const d = new Date(todayStart);
    d.setDate(d.getDate() + 1);
    return d;
  }, [todayStart]);

  const yesterdayStart = useMemo(() => {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - 1);
    return d;
  }, [todayStart]);

  const dayAfterTomorrowStart = useMemo(() => {
    const d = new Date(todayStart);
    d.setDate(d.getDate() + 2);
    return d;
  }, [todayStart]);

  const nextWeekStart = useMemo(() => {
    const d = new Date(todayStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [todayStart]);

  const yesterdayMeetings = useMemo(() => {
    return allMeetings.filter((meeting) => {
      const meetingDate = safeDate(getMeetingDate(meeting));
      if (!meetingDate) return false;
      return meetingDate >= yesterdayStart && meetingDate < todayStart;
    });
  }, [allMeetings, yesterdayStart, todayStart]);

  const upcomingMeetings = useMemo(() => {
    let future = allMeetings.filter((meeting) => {
      const meetingDate = safeDate(getMeetingDate(meeting));
      if (!meetingDate) return false;
      return meetingDate >= todayStart;
    });

    if (filter === "Tomorrow") {
      future = future.filter((meeting) => {
        const meetingDate = safeDate(getMeetingDate(meeting));
        return meetingDate && meetingDate >= tomorrowStart && meetingDate < dayAfterTomorrowStart;
      });
    } else if (filter === "This Week") {
      future = future.filter((meeting) => {
        const meetingDate = safeDate(getMeetingDate(meeting));
        return meetingDate && meetingDate >= todayStart && meetingDate < nextWeekStart;
      });
    }

    future.sort((a, b) => {
      const aDate = safeDate(getMeetingDate(a));
      const bDate = safeDate(getMeetingDate(b));
      return (aDate?.getTime() || 0) - (bDate?.getTime() || 0);
    });

    const seen = new Set();
    const deduped = [];

    for (const meeting of future) {
      const contactId = String(getContactId(meeting) || "");
      const dedupeKey = contactId || String(getMeetingId(meeting));

      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        deduped.push(meeting);
      }
    }

    return deduped;
  }, [
    allMeetings,
    filter,
    todayStart,
    tomorrowStart,
    dayAfterTomorrowStart,
    nextWeekStart,
  ]);

  if (loading) {
    return (
      <div className="page">
        <div style={{ textAlign: "center", padding: 80, color: "#9ca3af" }}>
          Loading meetings...
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {errorMsg ? (
        <div
          style={{
            background: "#fff1f0",
            border: "1px solid #ffa39e",
            color: "#cf1322",
            padding: "12px 16px",
            borderRadius: 12,
            marginBottom: 20,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Failed to load meetings: {errorMsg}
        </div>
      ) : null}

      <div style={{ marginBottom: 48 }}>
        <div className="page-header-row" style={{ marginBottom: 16 }}>
          <div>
            <h2 className="page-title">Yesterday's Meetings</h2>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
              {formatDate(yesterdayStart)} — what happened
            </p>
          </div>
          <span className="page-sub">{yesterdayMeetings.length} meetings</span>
        </div>

        {yesterdayMeetings.length === 0 ? (
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
            No meetings were scheduled yesterday
          </div>
        ) : (
          <div className="meetings-grid">
            {yesterdayMeetings.map((meeting) => (
              <MeetingCard
                key={getMeetingId(meeting)}
                meeting={meeting}
                section="past"
              />
            ))}
          </div>
        )}
      </div>

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

        <div className="filter-bar" style={{ marginBottom: 20 }}>
          {["All", "Tomorrow", "This Week"].map((item) => (
            <button
              key={item}
              className={`filter-pill ${filter === item ? "active" : ""}`}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {upcomingMeetings.length === 0 ? (
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
            No upcoming meetings found
          </div>
        ) : (
          <div className="meetings-grid">
            {upcomingMeetings.map((meeting) => (
              <MeetingCard
                key={getMeetingId(meeting)}
                meeting={meeting}
                section="upcoming"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
