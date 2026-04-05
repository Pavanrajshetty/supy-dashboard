// ── Meeting rows ──────────────────────────────────────────────
export const MEETINGS_DATA = [
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

// ── Date constants ────────────────────────────────────────────
export const TODAY    = "2026-04-04";
export const WEEK_END = "2026-04-10";

// ── Filter helper ─────────────────────────────────────────────
export function filterMeetings(meetings, filter, geoFil) {
  let rows = meetings;
  if (filter === "Today")     rows = rows.filter(r => r.date === TODAY);
  if (filter === "This Week") rows = rows.filter(r => r.date >= TODAY && r.date <= WEEK_END);
  if (filter === "High")      rows = rows.filter(r => r.priority === "High");
  if (geoFil)                 rows = rows.filter(r => r.geo === geoFil);
  return rows;
}
