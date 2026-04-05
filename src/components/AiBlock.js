import React from "react";

export default function AiBlock({ title, items, color }) {
  return (
    <div className={`ai-block ai-${color}`}>
      <div className="ai-block-label">{title}</div>
      <ul className="ai-block-list">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );
}
