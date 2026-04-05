import React, { useState, useMemo } from "react";
import { MEETINGS_DATA, filterMeetings } from "../data/meetingsBookedData";

export default function MeetingsBooked() {
  const allGeos = [...new Set(MEETINGS_DATA.map(m => m.geo))];
  const [filter, setFilter] = useState("All");
  const [geoFil, setGeoFil] = useState(null);

  const displayed = useMemo(
    () => filterMeetings(MEETINGS_DATA, filter, geoFil),
    [filter, geoFil]
  );

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">Meetings Booked</h2>
        <span className="page-sub">{displayed.length} meetings</span>
      </div>

      <div className="filter-bar">
        {["All","Today","This Week","High Priority"].map(f => {
          const val = f === "High Priority" ? "High" : f;
          return (
            <button key={f} className={`filter-pill ${filter===val && !geoFil ? "active" : ""}`}
              onClick={() => { setFilter(val); setGeoFil(null); }}>{f}</button>
          );
        })}
        <div className="filter-sep" />
        {allGeos.map(g => (
          <button key={g} className={`filter-pill ${geoFil===g ? "active" : ""}`}
            onClick={() => setGeoFil(prev => prev===g ? null : g)}>{g}</button>
        ))}
      </div>

      <div className="meetings-grid">
        {displayed.map(m => (
          <div className={`meeting-card ${m.priority==="High" ? "high-priority" : ""}`} key={m.id}>
            <div className="meeting-card-top">
              <span className={`priority-badge ${m.priority==="High" ? "high" : "standard"}`}>{m.priority}</span>
              <span className="meeting-geo">{m.flag} {m.geo}</span>
            </div>
            <div className="meeting-name">{m.name}</div>
            <div className="meeting-company">{m.company}</div>
            <div className="meeting-meta">
              <span>📅 {m.date} · {m.time}</span>
              <span>👤 {m.owner}</span>
            </div>
            <a className="meeting-link" href={m.hsUrl} target="_blank" rel="noreferrer">View in HubSpot ↗</a>
          </div>
        ))}
      </div>
    </div>
  );
}
