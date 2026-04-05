// ── Weekly spend + MQL rows ───────────────────────────────────
export const WEEKLY_DATA = [
  { week:"Week 1", spend:28400, mql:168, expected:180, achieved:168 },
  { week:"Week 2", spend:31200, mql:192, expected:185, achieved:192 },
  { week:"Week 3", spend:29800, mql:174, expected:185, achieved:174 },
  { week:"Week 4", spend:33440, mql:217, expected:190, achieved:217 },
];

// ── Formatter ─────────────────────────────────────────────────
export const fmtAED = v => `AED ${Number(v).toLocaleString("en", { maximumFractionDigits:0 })}`;

// ── Delta helper ──────────────────────────────────────────────
export function delta(expected, achieved) {
  const diff = achieved - expected;
  const pct  = expected ? ((diff / expected) * 100).toFixed(1) : 0;
  return { diff, pct, positive: diff >= 0 };
}
