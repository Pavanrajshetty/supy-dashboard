import React from "react";

const TABS = [
  { id: "executive", label: "Executive Summary" },
  { id: "mtd",       label: "MTD Data"          },
  { id: "qtd",       label: "QTD / Monthly"     },
  { id: "trends",    label: "Trends"            },
  { id: "wow",       label: "Week on Week"      },
  { id: "sql",       label: "SQL"               },
  { id: "meetings",  label: "Meetings Booked"   },
];

export default function Navbar({ activePage, setActivePage }) {
  return (
    <header className="app-header">
      <div className="app-brand">
        <div className="brand-icon">S</div>
        <span className="brand-name">Supy Marketing</span>
      </div>
      <nav className="tab-nav">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`nav-tab ${activePage === t.id ? "active" : ""}`}
            onClick={() => setActivePage(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="header-badge">
        <span className="live-dot" />
        Live Dashboard
      </div>
    </header>
  );
}
