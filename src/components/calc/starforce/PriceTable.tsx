"use client";

import { isProtected, starOdds, type StarforceOptions, type StarPrices } from "@/lib/calc/starforce";
import { count, pct } from "./format";

type Props = {
  /** stars an attempt can be made at on the way to the target */
  stars: number[];
  opts: StarforceOptions;
  /** prices from the API */
  apiPrices: StarPrices;
  /** prices the user typed in, which replace the API's */
  overrides: StarPrices;
  onOverride: (star: number, price: number | undefined) => void;
  /** expected attempts at each star with the chosen options */
  attemptsAt: Record<number, number>;
};

const cell = "px-2 py-1 text-right tabular-nums";

/** Odds and price of one attempt at each star; the price can be typed over. */
export default function PriceTable({ stars, opts, apiPrices, overrides, onOverride, attemptsAt }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
      <table className="w-full text-xs">
        <thead className="text-zinc-500">
          <tr className="border-b border-black/10 dark:border-white/15">
            <th className="px-2 py-1.5 text-left font-medium">강화</th>
            <th className={`${cell} font-medium`}>성공</th>
            <th className={`${cell} font-medium`}>Keep</th>
            <th className={`${cell} font-medium`}>Drop</th>
            <th className={`${cell} font-medium`}>Major Failure</th>
            <th className={`${cell} font-medium`}>1회 비용 (NESO)</th>
            <th className={`${cell} font-medium`}>기대 시도</th>
          </tr>
        </thead>
        <tbody>
          {stars.map((star) => {
            const o = starOdds(star, opts);
            const overridden = overrides[star] != null;
            const price = overrides[star] ?? apiPrices[star] ?? 0;
            return (
              <tr key={star} className="border-b border-black/5 last:border-0 dark:border-white/10">
                <td className="px-2 py-1 text-left">
                  {star} → {star + 1}
                </td>
                <td className={cell}>{pct(o.success)}</td>
                <td className={cell}>{o.keep ? pct(o.keep) : "–"}</td>
                <td className={cell}>{o.drop ? pct(o.drop) : "–"}</td>
                <td className={cell}>{o.major ? pct(o.major) : "–"}</td>
                <td className={cell}>
                  <span className="inline-flex items-center gap-1">
                    {isProtected(star, opts) && <span className="text-[10px] text-zinc-500">×2</span>}
                    {overridden && (
                      <button
                        type="button"
                        onClick={() => onOverride(star, undefined)}
                        className="text-[10px] text-orange-600 hover:underline"
                        title="API 가격으로 되돌리기"
                      >
                        직접 입력 ✕
                      </button>
                    )}
                    <input
                      type="number"
                      inputMode="decimal"
                      aria-label={`${star}성 1회 비용`}
                      min={0}
                      step="any"
                      value={price || ""}
                      placeholder="0"
                      onChange={(e) => {
                        const v = Math.max(0, Number(e.target.value) || 0);
                        onOverride(star, e.target.value === "" ? undefined : v);
                      }}
                      className={`w-28 rounded border bg-transparent px-1.5 py-0.5 text-right tabular-nums focus:border-orange-500 focus:outline-none ${
                        price > 0 ? "border-black/15 dark:border-white/20" : "border-red-500"
                      }`}
                    />
                  </span>
                </td>
                <td className={cell}>{attemptsAt[star] ? count(attemptsAt[star], 2) : "–"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
