export const MTD_DATA = [];

export function fmtAED(value) {
  return `AED ${Number(value || 0).toLocaleString()}`;
}

export function fmtUSD(value) {
  return `$${Number(value || 0).toLocaleString()}`;
}

export function fmtPct(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

export function delta(expected, achieved) {
  const exp = Number(expected || 0);
  const ach = Number(achieved || 0);
  const diff = ach - exp;
  const pct = exp ? Math.round((diff / exp) * 100) : 0;

  return {
    diff,
    pct,
    positive: diff >= 0,
  };
}
