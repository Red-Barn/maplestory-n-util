export const neso = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 2 });
export const count = (v: number, digits = 1) =>
  v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
/** A chance as a percentage, without trailing zeros (0.9975 → "99.75%"). */
export const pct = (p: number) => `${Number((p * 100).toFixed(3))}%`;

/** Sorted stars with consecutive runs joined ([12, 13, 14, 16] → "12~14·16성"). */
export function starList(stars: readonly number[]): string {
  const runs: [number, number][] = [];
  for (const s of [...stars].sort((a, b) => a - b)) {
    const last = runs[runs.length - 1];
    if (last && s === last[1] + 1) last[1] = s;
    else runs.push([s, s]);
  }
  return `${runs.map(([a, b]) => (a === b ? `${a}` : `${a}~${b}`)).join("·")}성`;
}
