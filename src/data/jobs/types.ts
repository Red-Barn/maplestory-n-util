import type { MainStat, StatEffect, StatKey } from "@/lib/stats/types";

/**
 * A skill whose effect text (at the character's current level, from /skills) is parsed.
 * `pick` limits which parsed stats count — effect texts also contain skill damage %, MP cost, etc.
 */
export type SkillRef = {
  name: string;
  pick: StatKey[];
  /** Only read the "[Passive Effect ...]" part — the rest describes the active skill. */
  passiveOnly?: boolean;
  /** Fixed effects while the skill is learned, for text that isn't a "<stat>: +N" form. */
  effects?: StatEffect[];
  /** The text gives the value per stack (e.g. per Light Charge); parsed values are multiplied by this. */
  stacks?: number;
};

export type BuffDef = {
  id: string;
  name: string;
  /** Learned skills whose parsed effects make up the buff (e.g. Sharp Eyes + its hyper passives). */
  skills?: SkillRef[];
  /** Fixed effects when the text can't be parsed (e.g. Maple Warrior's "AP by 15%"). */
  effects?: StatEffect[];
  /** Shown after the effect list, e.g. for effects the engine does not model. */
  note?: string;
  /**
   * Whether the API stat snapshot already includes this buff. Those start checked, so the
   * computed stats line up with the in-game values; the rest start unchecked and add on top.
   */
  defaultOn: boolean;
};

export type JobData = {
  jobCodes: number[];
  name: string;
  mainStat: MainStat;
  subStats: MainStat[];
  attackType: "ATT" | "MATT";
  /** Main stat AP = 5 × level + apBonus. 18 when omitted; differs per job (Aran: 23). */
  apBonus?: number;
  /** Innate values not tied to any skill/item (e.g. base critical rate). */
  base: StatEffect[];
  passives: SkillRef[];
  buffs: BuffDef[];
};
