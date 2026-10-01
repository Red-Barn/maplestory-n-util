"use client";

import { useState } from "react";
import type { LineOption, OptionMatch } from "@/lib/calc/potential/options";
import { percent } from "./fields";

const SHOWN_CASES = 50;
const TH = "px-3 py-1.5 font-medium";
const TD = "px-3 py-1.5";

/** listed chance (%) as the site shows it */
const listed = (v: number) => `${v.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}%`;

/**
 * Tables to check the result by hand: each line's option chances exactly as msu.io lists them, and
 * every combination that meets a set with its chance (the sum of which is the success chance).
 */
export default function ProbabilityTables({ lines, match }: { lines: LineOption[][]; match?: OptionMatch }) {
  const [allCases, setAllCases] = useState(false);

  // one row per option text, in the order it first appears over the 3 lines
  const options = [...new Set(lines.flatMap((line) => line.map((o) => o.option)))];
  const chanceOn = lines.map((line) => new Map(line.map((o) => [o.option, o.probability])));
  const cases = match ? (allCases ? match.cases : match.cases.slice(0, SHOWN_CASES)) : [];

  return (
    <div className="space-y-4">
      <details className="rounded-lg border border-black/10 dark:border-white/15">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium">줄별 옵션 확률 (msu.io 표기 그대로)</summary>
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <thead className="bg-black/5 text-zinc-500 dark:bg-white/5">
              <tr>
                <th className={`${TH} text-left`}>옵션</th>
                <th className={`${TH} text-right`}>1번째 줄</th>
                <th className={`${TH} text-right`}>2번째 줄</th>
                <th className={`${TH} text-right`}>3번째 줄</th>
              </tr>
            </thead>
            <tbody>
              {options.map((option) => (
                <tr key={option} className="border-t border-black/5 dark:border-white/10">
                  <td className={TD}>{option}</td>
                  {chanceOn.map((m, i) => (
                    <td key={i} className={`${TD} text-right`}>
                      {m.has(option) ? listed(m.get(option)!) : "–"}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-black/10 font-semibold dark:border-white/15">
                <td className={TD}>합계</td>
                {lines.map((line, i) => (
                  <td key={i} className={`${TD} text-right`}>
                    {listed(line.reduce((s, o) => s + o.probability, 0))}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </details>

      {match && match.cases.length > 0 && (
        <details className="rounded-lg border border-black/10 dark:border-white/15" open={match.cases.length <= 20}>
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
            충족한 경우의 수 {match.cases.length.toLocaleString()}개 (확률 높은 순)
          </summary>
          <div className="overflow-x-auto">
            <table className="w-full text-xs tabular-nums">
              <thead className="bg-black/5 text-zinc-500 dark:bg-white/5">
                <tr>
                  <th className={`${TH} text-right`}>#</th>
                  <th className={`${TH} text-left`}>1번째 줄</th>
                  <th className={`${TH} text-left`}>2번째 줄</th>
                  <th className={`${TH} text-left`}>3번째 줄</th>
                  <th className={`${TH} text-left`}>세트</th>
                  <th className={`${TH} text-right`}>확률</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c, i) => (
                  <tr key={c.options.join("|")} className="border-t border-black/5 dark:border-white/10">
                    <td className={`${TD} text-right text-zinc-500`}>{i + 1}</td>
                    {c.options.map((o, k) => (
                      <td key={k} className={TD}>
                        {o}
                      </td>
                    ))}
                    <td className={TD}>{c.sets.map((s) => s + 1).join(", ")}</td>
                    <td className={`${TD} text-right`}>
                      {percent(c.p, 8)}
                      {c.rescaled && <span title="줄 수 제한으로 다음 줄 확률을 다시 나눈 조합"> *</span>}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-black/10 font-semibold dark:border-white/15">
                  <td className={TD} colSpan={5}>
                    합계 (= 큐브 1개 성공 확률)
                  </td>
                  <td className={`${TD} text-right`}>{percent(match.p, 8)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="space-y-1 px-3 py-2 text-[11px] text-zinc-500">
            <p>
              조합 확률 = 1번째 줄 확률 × 2번째 줄 확률 × 3번째 줄 확률. * 표시는 줄 수 제한 옵션(Decent 스킬 등) 때문에
              다음 줄 확률을 &ldquo;표기 확률 ÷ (100% − 제외된 옵션 확률 합)&rdquo;으로 다시 나눈 조합입니다.
            </p>
            {match.cases.length > SHOWN_CASES && (
              <button type="button" onClick={() => setAllCases(!allCases)} className="text-orange-600 hover:underline">
                {allCases ? `상위 ${SHOWN_CASES}개만 보기` : `모두 보기 (${match.cases.length.toLocaleString()}개)`}
              </button>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
