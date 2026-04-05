import React, { useState, useMemo } from "react";
import { MEETINGS_DATA } from "../data/meetingsBookedData";
import FilterPill from "../components/FilterPill";

export default function MeetingsBooked() {
  const allGeos = [...new Set(MEETINGS_DATA.map(m => m.geo))];
  const [filter, setFilter]  = useState("All");
  const [geoFil, setGeoFil]  = useState(null);

  const today   = "2026-04-04";
  const weekEnd = "2026-04-10";

  const displayed = useMemo(() => {
    let rows = MEETINGS_DATA;
    if (filter === "Today")     rows = rows.filter(r => r.date === today);
    if (filter === "This Week") rows = rows.filter(r => r.date >= today && r.date <= weekEnd);
    if (filter === "High")      rows = rows.filter(r => r.priority === "High");
    if (geoFil) rows = rows.filter(r => r.geo === geoFil);
    return rows;
  }, [filter, geoFil]);

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">Meetings Booked</h2>
        <span className="page-sub">{displayed.length} meetings</span>
      </div>

      <div className="filter-bar">
        {["All","Today","This Week","High Priority"].map(f => (
          <FilterPill key={f} label={f}
            active={filter === (f === "High Priority" ? "High" : f) && !geoFil}
            onClick={() => { setFilter(f === "High Priority" ? "High" : f); setGeoFil(null); }}
          />
        ))}
        <div className="filter-sep" />
        {allGeos.map(g => (
          <FilterPill key={g} label={g} active={geoFil === g} onClick={() => setGeoFil(prev => prev === g ? null : g)} />
        ))}
      </div>

      <div className="meetings-grid">
        {displayed.map(m => (
          <div className={`meeting-card ${m.priority === "High" ? "high-priority" : ""}`} key={m.id}>
            <div className="meeting-card-top">
              <span className={`priority-badge ${m.priority === "High" ? "high" : "standard"}`}>
                {m.priority}
              </span>
              <span className="meeting-geo">{m.flag} {m.geo}</span>
            </div>
            <div className="meeting-name">{m.name}</div>
            <div className="meeting-company">{m.company}</div>
            <div className="meeting-meta">
              <span>📅 {m.date} · {m.time}</span>
              <span>👤 {m.owner}</span>
            </div>
            <a className="meeting-link" href={m.hsUrl} target="_blank" rel="noreferrer">
              View in HubSpot ↗
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
