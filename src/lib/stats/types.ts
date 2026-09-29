export const MAIN_STATS = ["STR", "DEX", "INT", "LUK"] as const;
export type MainStat = (typeof MAIN_STATS)[number];

export type StatKey =
  // flat, multiplied by stat %
  | MainStat
  | "HP"
  | "MP"
  | "ATT"
  | "MATT"
  // flat, NOT multiplied by stat % (arcane symbols, hyper stats)
  | `${MainStat}_FIXED`
  // percent
  | `${MainStat}%`
  | "ALL%"
  | "HP%"
  | "MP%"
  | "ATT%"
  | "MATT%"
  | "AP%" // % of AP-assigned stats only (Maple Warrior)
  | "DMG%"
  | "BOSS%"
  | "NORMAL%"
  | "CRIT%"
  | "CDMG%"
  // multiplicative percent
  | "IED%"
  | "FD%";

export type StatSource =
  | "base"
  | "equip-base"
  | "starforce"
  | "flame"
  | "set"
  | "potential"
  | "bonus-potential"
  | "arcane"
  | "hyper"
  | "ability"
  | "skill"
  | "job-buff"
  | "consumable"
  | "synergy"
  | "union"
  | "collection"
  | "custom";

export type StatEffect = { stat: StatKey; value: number };

export type StatContribution = StatEffect & {
  source: StatSource;
  /** e.g. item or skill name, shown in breakdown tooltips */
  label: string;
};

export type ComputedStats = {
  /** Final values comparable to the in-game stat window. */
  final: Record<"STR" | "DEX" | "INT" | "LUK" | "ATT" | "MATT" | "DMG%" | "BOSS%" | "NORMAL%" | "CRIT%" | "CDMG%" | "IED%" | "FD%", number>;
  /** Raw sums per StatKey (IED/FD combined multiplicatively). */
  totals: Partial<Record<StatKey, number>>;
  contributions: StatContribution[];
};
