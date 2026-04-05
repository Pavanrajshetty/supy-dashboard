import React from "react";

export default function FilterPill({ label, active, onClick }) {
  return (
    <button className={`filter-pill ${active ? "active" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}
