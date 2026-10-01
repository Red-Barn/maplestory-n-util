"use client";

import type { Expected, StarforceOptions } from "@/lib/calc/starforce";
import { count, neso, starList } from "./format";

export type Combo = { opts: StarforceOptions; expected: Expected };

const cell = "px-2 py-1.5 text-right tabular-nums";

/** Expected price, attempts and Major Failures for Star Catch off/on × Protect none/the chosen stars. */
export default function ResultTable(props: {
  combos: Combo[];
  selected: StarforceOptions;
  /** false while a star on the way has no price: the price column can't be trusted */
  priced: boolean;
  onSelect: (opts: StarforceOptions) => void;
}) {
  const cheapest = Math.min(...props.combos.map((c) => c.expected.cost));
  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
      <table className="w-full text-sm">
        <thead className="text-xs text-zinc-500">
          <tr className="border-b border-black/10 dark:border-white/15">
            <th className="px-2 py-1.5 text-left font-medium">Star Catch</th>
            <th className="px-2 py-1.5 text-left font-medium">Protect</th>
            <th className={`${cell} font-medium`}>기대 비용 (NESO)</th>
            <th className={`${cell} font-medium`}>기대 시도 횟수</th>
            <th className={`${cell} font-medium`}>Major Failure 기대 횟수</th>
          </tr>
        </thead>
        <tbody>
          {props.combos.map(({ opts, expected }) => {
            const selected = opts.starCatch === props.selected.starCatch && opts.protect.join() === props.selected.protect.join();
            return (
              <tr
                key={`${opts.starCatch}-${opts.protect.join()}`}
                onClick={() => props.onSelect(opts)}
                className={`cursor-pointer border-b border-black/5 last:border-0 dark:border-white/10 ${
                  selected ? "bg-orange-500/10 font-medium" : "hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <td className="px-2 py-1.5">{opts.starCatch ? "사용" : "–"}</td>
                <td className="px-2 py-1.5">{opts.protect.length ? starList(opts.protect) : "–"}</td>
                <td className={cell}>
                  {props.priced ? neso(expected.cost) : "–"}
                  {props.priced && expected.cost === cheapest && (
                    <span className="ml-1 text-[10px] text-green-600 dark:text-green-400">최저</span>
                  )}
                </td>
                <td className={cell}>{count(expected.attempts)}</td>
                <td className={cell}>{count(expected.majorFailures, 3)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
