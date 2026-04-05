import React from "react";

export default function KpiCard({ icon, label, value, sub }) {
  return (
    <div className="kpi-card">
      <span className="kpi-icon">{icon}</span>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
