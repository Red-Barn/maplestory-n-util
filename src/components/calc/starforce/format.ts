export const neso = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 2 });
export const count = (v: number, digits = 1) =>
  v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
/** A chance as a percentage, without trailing zeros (0.9975 → "99.75%"). */
export const pct = (p: number) => `${Number((p * 100).toFixed(3))}%`;
