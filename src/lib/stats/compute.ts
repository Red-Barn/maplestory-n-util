import type { JobData } from "@/data/jobs";
import type { ApStat } from "@/types/msu";
import type { ComputedStats, MainStat, StatContribution, StatKey } from "./types";
import { MAIN_STATS } from "./types";

const MULTIPLICATIVE: StatKey[] = ["IED%", "FD%"];

/**
 * AP per main stat. MSU doesn't expose AP: the main stat gets 5 × level + 18
 * (e.g. 1238 at Lv.244, confirmed in-game), every other stat stays at its minimum 4.
 * The constant differs per job (JobData.apBonus, e.g. 23 for Aran).
 */
export const DEFAULT_AP_BONUS = 18;

export function estimateAp(
  level: number,
  job: Pick<JobData, "mainStat" | "apBonus"> | undefined,
): Record<MainStat, number> {
  const ap = { STR: 4, DEX: 4, INT: 4, LUK: 4 };
  ap[job?.mainStat ?? "STR"] = 5 * level + (job?.apBonus ?? DEFAULT_AP_BONUS);
  return ap;
}

export function sumStats(contributions: StatContribution[]): Partial<Record<StatKey, number>> {
  const totals: Partial<Record<StatKey, number>> = {};
  const product: Partial<Record<StatKey, number>> = {};
  for (const c of contributions) {
    if (MULTIPLICATIVE.includes(c.stat)) {
      const factor = c.stat === "IED%" ? 1 - c.value / 100 : 1 + c.value / 100;
      product[c.stat] = (product[c.stat] ?? 1) * factor;
    } else {
      totals[c.stat] = (totals[c.stat] ?? 0) + c.value;
    }
  }
  // IED: 1 - Π(1 - x);  FD: Π(1 + x) - 1
  if (product["IED%"] !== undefined) totals["IED%"] = (1 - product["IED%"]) * 100;
  if (product["FD%"] !== undefined) totals["FD%"] = (product["FD%"] - 1) * 100;
  return totals;
}

export function computeStats(contributions: StatContribution[], ap: Record<MainStat, number>): ComputedStats {
  const t = sumStats(contributions);
  const v = (k: StatKey) => t[k] ?? 0;

  const main = {} as Record<MainStat, number>;
  for (const s of MAIN_STATS) {
    const apPart = Math.floor(ap[s] * (1 + v("AP%") / 100));
    const pct = v(`${s}%`) + v("ALL%");
    main[s] = Math.floor((apPart + v(s)) * (1 + pct / 100)) + v(`${s}_FIXED`);
  }

  return {
    final: {
      ...main,
      ATT: Math.floor(v("ATT") * (1 + v("ATT%") / 100)),
      MATT: Math.floor(v("MATT") * (1 + v("MATT%") / 100)),
      "DMG%": v("DMG%"),
      "BOSS%": v("BOSS%"),
      "NORMAL%": v("NORMAL%"),
      "CRIT%": v("CRIT%"),
      "CDMG%": v("CDMG%"),
      "IED%": round2(v("IED%")),
      "FD%": round2(v("FD%")),
    },
    totals: t,
    contributions,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export type FinalStats = ComputedStats["final"];

/** In-game stat window values from the MSU apStat block. */
export function apStatToFinal(ap: ApStat): FinalStats {
  return {
    STR: ap.str.total,
    DEX: ap.dex.total,
    INT: ap.int.total,
    LUK: ap.luk.total,
    ATT: ap.att.total,
    MATT: ap.magicAtt.total,
    "DMG%": ap.damage.total,
    "BOSS%": ap.bossMonsterDamage.total,
    "NORMAL%": ap.normalEnemyDamage.total,
    "CRIT%": ap.criticalRate.total,
    "CDMG%": ap.criticalDamage.total,
    "IED%": ap.ignoreDefence.total,
    "FD%": ap.finalDamage.total,
  };
}
