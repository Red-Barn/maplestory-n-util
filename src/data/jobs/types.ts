import type { MainStat, StatEffect, StatKey } from "@/lib/stats/types";

/**
 * A skill whose effect text (at the character's current level, from /skills) is parsed.
 * `pick` limits which parsed stats count — effect texts also contain skill damage %, MP cost, etc.
 */
export type SkillRef = { name: string; pick: StatKey[] };

export type BuffDef = {
  id: string;
  name: string;
  /** Learned skills whose parsed effects make up the buff (e.g. Sharp Eyes + its hyper passives). */
  skills?: SkillRef[];
  /** Fixed effects when the text can't be parsed (e.g. Maple Warrior's "AP by 15%"). */
  effects?: StatEffect[];
  /** Permanent/long-duration buffs start on; burst buffs start off. */
  defaultOn: boolean;
};

export type JobData = {
  jobCodes: number[];
  name: string;
  mainStat: MainStat;
  subStats: MainStat[];
  attackType: "ATT" | "MATT";
  /** Innate values not tied to any skill/item (e.g. base critical rate). */
  base: StatEffect[];
  passives: SkillRef[];
  buffs: BuffDef[];
};
