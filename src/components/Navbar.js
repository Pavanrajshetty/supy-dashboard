import React from "react";
import { TABS } from "../config/constants";

function Tab({ label, active, onClick }) {
  return (
    <button className={`nav-tab ${active ? "active" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}

export default function Navbar({ activePage, setActivePage }) {
  return (
    <header className="app-header">
      <div className="app-brand">
        <div className="brand-icon">S</div>
        <span className="brand-name">Supy Marketing</span>
      </div>
      <nav className="tab-nav">
        {TABS.map(t => (
          <Tab
            key={t.id}
            label={t.label}
            active={activePage === t.id}
            onClick={() => setActivePage(t.id)}
          />
        ))}
      </nav>
      <div className="header-badge">
        <span className="live-dot" />
        Live Dashboard
      </div>
    </header>
  );
}
