import { HYPER_MAX_LEVEL, HYPER_STATS } from "@/data/hyperStats";
import {
  choicesForJob,
  collectChoices,
  computeStats,
  damageScore,
  damageTerms,
  type DamageTerms,
  type JobView,
  type MainStat,
  type StatContribution,
} from "@/lib/stats";
import { cumulativeCost, inputFromLevels, type HyperLevels } from "./cost";

// Best hyper stat levels for a point budget, by damage score.
//
// Each hyper stat feeds exactly one term of the score and the score is the product of the terms,
// so the terms can be optimized separately: per term, try every level combination of its stats
// and keep the best term value for each cost; then a knapsack over the terms picks how many
// points each one gets. The term values come from the real formula (computeStats + damageTerms),
// so ATT flooring, the 100% crit rate cap and the 0 floor of the DEF term are all accounted for.

/** Hyper stat ids (see HYPER_STATS) behind each damage term. */
const termStats = (job: JobView): [keyof DamageTerms, string[]][] => [
  ["stat", [job.mainStat, ...job.subStats].map((s: MainStat) => s.toLowerCase())],
  ["attack", ["attackAndMagicAttack"]],
  ["damage", ["damage", "bossMonsterDamage"]],
  ["crit", ["criticalRate", "criticalDamage"]],
  ["defense", ["ignoreDefence"]],
];

export type HyperContext = {
  /** Everything in effect except hyper stats (useCharacterStats' `withoutHyper`). */
  base: StatContribution[];
  ap: Record<MainStat, number>;
  job: JobView;
};

export const hyperContributions = (levels: HyperLevels): StatContribution[] =>
  collectChoices(HYPER_STATS, inputFromLevels(levels), "hyper");

export const hyperTerms = ({ base, ap, job }: HyperContext, levels: HyperLevels): DamageTerms =>
  damageTerms(computeStats([...base, ...hyperContributions(levels)], ap).final, job);

export const hyperScore = (ctx: HyperContext, levels: HyperLevels): number => damageScore(hyperTerms(ctx, levels));

/** Every level combination of `ids` that costs at most `budget`. */
function* combinations(ids: string[], budget: number, maxLevel: number): Generator<{ levels: HyperLevels; cost: number }> {
  if (ids.length === 0) {
    yield { levels: {}, cost: 0 };
    return;
  }
  const [id, ...rest] = ids;
  for (let level = 0; level <= maxLevel && cumulativeCost(level) <= budget; level++) {
    const cost = cumulativeCost(level);
    for (const tail of combinations(rest, budget - cost, maxLevel)) {
      yield { levels: { [id]: level, ...tail.levels }, cost: cost + tail.cost };
    }
  }
}

type Option = { cost: number; value: number; levels: HyperLevels };

/** Best value of one term for each cost its stats can add up to. */
function termOptions(ctx: HyperContext, term: keyof DamageTerms, ids: string[], budget: number, maxLevel: number): Option[] {
  const best = new Map<number, Option>();
  for (const { levels, cost } of combinations(ids, budget, maxLevel)) {
    const value = hyperTerms(ctx, levels)[term];
    const known = best.get(cost);
    if (!known || value > known.value) best.set(cost, { cost, value, levels });
  }
  return [...best.values()];
}

export type HyperPlan = {
  /** Level per hyper stat the job uses; the stats it doesn't use are left out (Lv.0). */
  levels: HyperLevels;
  /** Points the levels cost, at most the budget. */
  used: number;
  score: number;
};

/**
 * The levels with the highest damage score for `budget` points. Among equal scores the cheapest
 * wins, so no points go to stats that add nothing (crit rate above 100%, other jobs' stats).
 */
export function optimizeHyper(ctx: HyperContext, budget: number, maxLevel = HYPER_MAX_LEVEL): HyperPlan {
  const points = Math.max(0, Math.floor(budget));
  const usable = new Set(choicesForJob(HYPER_STATS, ctx.job).map((d) => d.id));
  const terms = termStats(ctx.job).map(([term, ids]) =>
    termOptions(ctx, term, ids.filter((id) => usable.has(id)), points, maxLevel),
  );

  // product[p] = best product of the terms so far using exactly p points; -1 = p can't be reached
  let product = [1, ...new Array<number>(points).fill(-1)];
  const picked: (Option | undefined)[][] = [];
  for (const options of terms) {
    const next = new Array<number>(points + 1).fill(-1);
    const pick = new Array<Option | undefined>(points + 1).fill(undefined);
    for (let p = 0; p <= points; p++) {
      for (const option of options) {
        const before = p - option.cost;
        if (before < 0 || product[before] < 0) continue;
        const value = product[before] * option.value;
        if (value > next[p]) {
          next[p] = value;
          pick[p] = option;
        }
      }
    }
    product = next;
    picked.push(pick);
  }

  let used = 0;
  for (let p = 1; p <= points; p++) if (product[p] > product[used]) used = p;

  const levels: HyperLevels = {};
  for (let t = terms.length - 1, p = used; t >= 0; t--) {
    const option = picked[t][p]!;
    Object.assign(levels, option.levels);
    p -= option.cost;
  }
  return { levels, used, score: hyperScore(ctx, levels) };
}
