import React, { useState, useMemo } from "react";

// ── Data ─────────────────────────────────────────────────────
const MEETINGS_DATA = [
  { id:1,  name:"Hassan Al Rashid",  company:"The Grill House Group", date:"2026-04-04", time:"10:00", owner:"Sara K.",  geo:"GCC",      flag:"🇦🇪", priority:"High",     hsUrl:"#" },
  { id:2,  name:"Maria Santos",      company:"Foodmark Philippines",  date:"2026-04-04", time:"14:00", owner:"Ana G.",  geo:"SEA",      flag:"🇵🇭", priority:"Standard", hsUrl:"#" },
  { id:3,  name:"James Thornton",    company:"The Chefs Table",       date:"2026-04-05", time:"09:30", owner:"Liam T.", geo:"Europe",   flag:"🇬🇧", priority:"High",     hsUrl:"#" },
  { id:4,  name:"Fatima Al Zaabi",   company:"Desert Rose Dining",    date:"2026-04-05", time:"11:00", owner:"Sara K.",  geo:"GCC",      flag:"🇦🇪", priority:"High",     hsUrl:"#" },
  { id:5,  name:"Youssef Ben Salah", company:"Saveur Bistro Group",   date:"2026-04-06", time:"13:00", owner:"Maya L.", geo:"N.Africa", flag:"🇹🇳", priority:"Standard", hsUrl:"#" },
  { id:6,  name:"Priya Nair",        company:"SkyDine Singapore",     date:"2026-04-06", time:"15:30", owner:"Ana G.",  geo:"SEA",      flag:"🇸🇬", priority:"Standard", hsUrl:"#" },
  { id:7,  name:"Omar Khalil",       company:"Almaza Hospitality",    date:"2026-04-07", time:"10:00", owner:"Ahmed R.",geo:"N.Africa", flag:"🇪🇬", priority:"High",     hsUrl:"#" },
  { id:8,  name:"David Munroe",      company:"Fusion Kitchen AU",     date:"2026-04-07", time:"11:30", owner:"Liam T.", geo:"APAC",     flag:"🇦🇺", priority:"Standard", hsUrl:"#" },
  { id:9,  name:"Aisha Mwangi",      company:"Cape Town Eats",        date:"2026-04-08", time:"09:00", owner:"Sara K.",  geo:"Africa",   flag:"🇿🇦", priority:"Standard", hsUrl:"#" },
  { id:10, name:"Tariq Al Sulaiman", company:"Nando's MENA",          date:"2026-04-08", time:"14:00", owner:"Ahmed R.",geo:"GCC",      flag:"🇸🇦", priority:"High",     hsUrl:"#" },
];

const TODAY   = "2026-04-04";
const WEEK_END = "2026-04-10";

// ── Page ─────────────────────────────────────────────────────
export default function MeetingsBooked() {
  const allGeos = [...new Set(MEETINGS_DATA.map(m => m.geo))];
  const [filter, setFilter] = useState("All");
  const [geoFil, setGeoFil] = useState(null);

  const displayed = useMemo(() => {
    let rows = MEETINGS_DATA;
    if (filter === "Today")     rows = rows.filter(r => r.date === TODAY);
    if (filter === "This Week") rows = rows.filter(r => r.date >= TODAY && r.date <= WEEK_END);
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
