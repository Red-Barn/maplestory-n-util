import { GRADES } from "@/data/potential";
import type { TierUpCounts, TierUpPlan } from "@/lib/calc/potential/tierUp";

const gradeLabel = (grade: number) => GRADES.find((g) => g.grade === grade)?.label ?? "";
const count = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 2 });
const neso = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 2 });
const percent = (p: number) => `${(p * 100).toLocaleString(undefined, { maximumFractionDigits: 4 })}%`;

const TH = "px-3 py-1.5 text-right font-medium";
const TD = "px-3 py-1.5 text-right";

function CountCells({ counts, price }: { counts: TierUpCounts; price?: number }) {
  return (
    <>
      <td className={TD}>{count(counts.expected)}</td>
      <td className={TD}>{counts.n90.toLocaleString()}</td>
      <td className={TD}>{counts.n99.toLocaleString()}</td>
      {price !== undefined && (
        <>
          <td className={TD}>{neso(counts.expected * price)}</td>
          <td className={TD}>{neso(counts.n90 * price)}</td>
          <td className={TD}>{neso(counts.n99 * price)}</td>
        </>
      )}
    </>
  );
}

/** Cubes and cost per step and for the whole way. `price` = NESO per cube; cost columns are hidden without it. */
export default function TierUpResult({ plan, price }: { plan: TierUpPlan; price?: number }) {
  const several = plan.steps.length > 1;
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
        <table className="w-full text-xs tabular-nums">
          <thead className="bg-black/5 text-zinc-500 dark:bg-white/5">
            <tr>
              <th className="px-3 py-1.5 text-left font-medium">단계</th>
              <th className={TH}>확률</th>
              <th className={TH}>기대 개수</th>
              <th className={TH}>90% 개수</th>
              <th className={TH}>99% 개수</th>
              {price !== undefined && (
                <>
                  <th className={TH}>기대 비용</th>
                  <th className={TH}>90% 비용</th>
                  <th className={TH}>99% 비용</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {plan.steps.map((s) => (
              <tr key={s.from} className="border-t border-black/5 dark:border-white/10">
                <td className="px-3 py-1.5">
                  {gradeLabel(s.from)} → {gradeLabel(s.to)}
                </td>
                <td className={TD}>{percent(s.p)}</td>
                <CountCells counts={s} price={price} />
              </tr>
            ))}
            {several && (
              <tr className="border-t border-black/10 font-semibold dark:border-white/15">
                <td className="px-3 py-1.5">합계</td>
                <td className={TD}>–</td>
                <CountCells counts={plan.total} price={price} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-500">
        기대 개수 = 1 ÷ 확률. 90%·99% 개수는 그만큼 쓰면 90%·99% 확률로 등급이 오르는 개수입니다(운이 나쁠 때 기준).
        {several && " 합계의 90%·99% 개수는 모든 단계를 끝낼 확률로 계산해 단계별 값을 더한 것보다 작습니다."}
        {price !== undefined && " 비용 단위는 NESO입니다."}
      </p>
    </div>
  );
}
