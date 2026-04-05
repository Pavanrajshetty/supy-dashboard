// ── Geo list (drives MTD_DATA row generation) ─────────────────
const GEO_LIST = [
  { code:"AE", label:"UAE",   flag:"🇦🇪", region:"GCC"      },
  { code:"SA", label:"KSA",   flag:"🇸🇦", region:"GCC"      },
  { code:"GB", label:"UK",    flag:"🇬🇧", region:"Europe"   },
  { code:"AU", label:"AUS",   flag:"🇦🇺", region:"APAC"     },
  { code:"PH", label:"PHL",   flag:"🇵🇭", region:"SEA"      },
  { code:"DZ", label:"DZA",   flag:"🇩🇿", region:"N.Africa" },
  { code:"TN", label:"TUN",   flag:"🇹🇳", region:"N.Africa" },
  { code:"EG", label:"Egypt", flag:"🇪🇬", region:"N.Africa" },
];

// ── MTD performance data ──────────────────────────────────────
export const MTD_DATA = GEO_LIST.map((geo, i) => ({
  geo: geo.label, flag: geo.flag,
  spend:      { expected:[18000,12000,8000,22000,6000,5000,14000,9000][i],  achieved:[16200,14500,6800,19800,7200,7800,12600,8100][i]  },
  mql:        { expected:[80,55,35,90,28,22,60,38][i],                      achieved:[72,68,28,81,34,29,54,33][i]                      },
  costPerMql: { expected:[225,218,229,244,214,227,233,237][i],              achieved:[225,213,243,244,212,269,233,245][i]              },
  sqlPct:     { expected:[9,8,7,10,8,9,8,7][i],                            achieved:[8.3,9.1,7.1,8.6,9.4,10.3,7.8,7.6][i]           },
  sql:        { expected:[7,4,2,9,2,2,5,3][i],                             achieved:[6,6,2,7,3,3,4,3][i]                             },
  costPerSql: { expected:[2571,3000,4000,2444,3000,2500,2800,3000][i],     achieved:[2700,2417,3400,2829,2400,2600,3150,2700][i]     },
  pipeline:   { expected:[98000,56000,28000,126000,28000,28000,70000,42000][i], achieved:[84000,84000,28000,98000,42000,42000,56000,42000][i] },
  aprPlanned: [20000,13000,9000,24000,7000,6000,15000,10000][i],
  incDec:     [2000,1000,-1000,2000,1000,1000,1000,1000][i],
}));

// ── Formatters ────────────────────────────────────────────────
export const fmtAED = v => `AED ${Number(v).toLocaleString("en", { maximumFractionDigits:0 })}`;
export const fmtUSD = v => `$${Number(v).toLocaleString("en", { maximumFractionDigits:0 })}`;
export const fmtPct = v => `${Number(v).toFixed(1)}%`;

// ── Delta helper ──────────────────────────────────────────────
export function delta(expected, achieved) {
  const diff = achieved - expected;
  const pct  = expected ? ((diff / expected) * 100).toFixed(1) : 0;
  return { diff, pct, positive: diff >= 0 };
}
