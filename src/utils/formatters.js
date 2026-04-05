// ============================================================
// FORMATTERS
// ============================================================

export const fmtAED = (v) => `AED ${Number(v).toLocaleString("en", { maximumFractionDigits:0 })}`;
export const fmtUSD = (v) => `$${Number(v).toLocaleString("en", { maximumFractionDigits:0 })}`;
export const fmtNum = (v) => Number(v).toLocaleString("en", { maximumFractionDigits:0 });
export const fmtPct = (v) => `${Number(v).toFixed(1)}%`;

export function fmt(value, format) {
  if (format === "aed") return fmtAED(value);
  if (format === "usd") return fmtUSD(value);
  if (format === "pct") return fmtPct(value);
  return fmtNum(value);
}

export function delta(expected, achieved) {
  const diff = achieved - expected;
  const pct  = expected ? ((diff / expected) * 100).toFixed(1) : 0;
  return { diff, pct, positive: diff >= 0 };
}
