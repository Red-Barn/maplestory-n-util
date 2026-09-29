import type { JobData } from "@/data/jobs";
import type { ApStat } from "@/types/msu";
import type { ComputedStats, MainStat, StatContribution, StatKey } from "./types";
import { MAIN_STATS } from "./types";

const MULTIPLICATIVE: StatKey[] = ["IED%", "FD%"];

/**
 * AP auto-assigned to each main stat. MSU doesn't expose AP, so it's estimated:
 * every stat except the main one keeps its minimum 4, the rest goes to the main stat.
 * Total AP = 5 per level + 18 (tuned against RedBarn; see compute.test.ts).
 */
export function estimateAp(level: number, job: Pick<JobData, "mainStat"> | undefined): Record<MainStat, number> {
  const main = job?.mainStat ?? "STR";
  const total = 5 * level + 18;
  const ap = { STR: 4, DEX: 4, INT: 4, LUK: 4 };
  ap[main] = total - 12;
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

export const CALIBRATION_LABEL = "API 미제공 스탯 (유니온·링크·길드·칭호 등)";

/**
 * Contributions that close the gap between our computed stats and the in-game values, so later
 * calculators (stat equivalence, gear swaps) start from the real numbers. Main-stat gaps are
 * modelled as %-unaffected flat stat (union/legion style), ATT gaps as flat ATT before ATT%.
 */
export function calibrate(contributions: StatContribution[], ap: Record<MainStat, number>, target: FinalStats): StatContribution[] {
  const cur = computeStats(contributions, ap);
  const t = cur.totals;
  const out: StatContribution[] = [];
  const add = (stat: StatKey, value: number) => {
    const v = round2(value);
    if (v !== 0) out.push({ stat, value: v, source: "calibration", label: CALIBRATION_LABEL });
  };

  for (const s of MAIN_STATS) add(`${s}_FIXED`, target[s] - cur.final[s]);
  for (const [flat, pct] of [["ATT", "ATT%"], ["MATT", "MATT%"]] as const) {
    const mult = 1 + (t[pct] ?? 0) / 100;
    // One flat ATT is worth `mult` final ATT, so an integer bonus can overshoot; aim for the
    // middle of the target's floor bucket instead.
    add(flat, (target[flat] + 0.5) / mult - (t[flat] ?? 0));
  }
  for (const k of ["DMG%", "BOSS%", "NORMAL%", "CRIT%", "CDMG%"] as const) add(k, target[k] - cur.final[k]);
  const ied = t["IED%"] ?? 0;
  if (target["IED%"] > ied) add("IED%", (1 - (1 - target["IED%"] / 100) / (1 - ied / 100)) * 100);
  const fd = t["FD%"] ?? 0;
  if (target["FD%"] !== round2(fd)) add("FD%", ((1 + target["FD%"] / 100) / (1 + fd / 100) - 1) * 100);
  return out;
}
