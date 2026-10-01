import { OPTION_LIMITS, PARTS, type Part } from "@/data/potential";

// Option rolls: the chance that one cube gives lines matching what the user wants.
//
// A cube rolls 3 lines, each from its own table (line 2 and 3 tables already mix the item's grade
// with the grade below). Some options may only appear on 1 or 2 of the 3 lines (OPTION_LIMITS):
// once a line reaches that limit, later lines roll from the remaining options, each scaled by
// 1 / (100% − the excluded options' chances). Every (line 1, line 2, line 3) combination is
// enumerated — at most ~40³ — so the result is exact.

/** One option of one line's table, as the probability search gives it (`probability` in %). */
export type LineOption = { option: string; probability: number };

/** What an option line adds to one effect, e.g. "Boss Damage: +40%" → BOSS% 40. */
export type Effect =
  | "STR%"
  | "DEX%"
  | "INT%"
  | "LUK%"
  | "ALL%"
  | "HP%"
  | "MP%"
  | "ATT%"
  | "MATT%"
  | "CRIT%"
  | "CDMG%"
  | "DMG%"
  | "BOSS%"
  | "IED%"
  | "STR/10Lv"
  | "DEX/10Lv"
  | "INT/10Lv"
  | "LUK/10Lv"
  | "ATT/10Lv"
  | "MATT/10Lv"
  | "COOLDOWN";

// Anchored on the whole line so "Boss Damage" isn't read as "Damage" and so on.
const EFFECT_PATTERNS: [RegExp, Effect][] = [
  [/^STR\s*:\s*\+(\d+)%$/i, "STR%"],
  [/^DEX\s*:\s*\+(\d+)%$/i, "DEX%"],
  [/^INT\s*:\s*\+(\d+)%$/i, "INT%"],
  [/^LUK\s*:\s*\+(\d+)%$/i, "LUK%"],
  [/^All Stats\s*:\s*\+(\d+)%$/i, "ALL%"],
  [/^Max HP\s*:\s*\+(\d+)%$/i, "HP%"],
  [/^Max MP\s*:\s*\+(\d+)%$/i, "MP%"],
  [/^ATT\s*:\s*\+(\d+)%$/i, "ATT%"],
  [/^Magic ATT\s*:\s*\+(\d+)%$/i, "MATT%"],
  [/^Critical Rate\s*:\s*\+(\d+)%$/i, "CRIT%"],
  [/^Critical Damage\s*:\s*\+(\d+)%$/i, "CDMG%"],
  [/^Damage\s*:\s*\+(\d+)%$/i, "DMG%"],
  [/^Boss Damage\s*:\s*\+(\d+)%$/i, "BOSS%"],
  [/^DEF Ignored\s*:\s*\+(\d+)%$/i, "IED%"],
  [/^STR per 10 Character Levels\s*:\s*\+(\d+)$/i, "STR/10Lv"],
  [/^DEX per 10 Character Levels\s*:\s*\+(\d+)$/i, "DEX/10Lv"],
  [/^INT per 10 Character Levels\s*:\s*\+(\d+)$/i, "INT/10Lv"],
  [/^LUK per 10 Character Levels\s*:\s*\+(\d+)$/i, "LUK/10Lv"],
  [/^ATT per 10 Character Levels\s*:\s*\+(\d+)$/i, "ATT/10Lv"],
  [/^M\. ATT per 10 Character Levels\s*:\s*\+(\d+)$/i, "MATT/10Lv"],
  [/^"?Skill Cooldown\s*:\s*-(\d+)\s*sec/i, "COOLDOWN"],
];

export const EFFECT_LABELS: Record<Effect, string> = {
  "STR%": "STR %",
  "DEX%": "DEX %",
  "INT%": "INT %",
  "LUK%": "LUK %",
  "ALL%": "올스탯 %",
  "HP%": "최대 HP %",
  "MP%": "최대 MP %",
  "ATT%": "공격력 %",
  "MATT%": "마력 %",
  "CRIT%": "크리티컬 확률 %",
  "CDMG%": "크리티컬 데미지 %",
  "DMG%": "데미지 %",
  "BOSS%": "보스 데미지 %",
  "IED%": "방어율 무시 %",
  "STR/10Lv": "10레벨당 STR",
  "DEX/10Lv": "10레벨당 DEX",
  "INT/10Lv": "10레벨당 INT",
  "LUK/10Lv": "10레벨당 LUK",
  "ATT/10Lv": "10레벨당 공격력",
  "MATT/10Lv": "10레벨당 마력",
  COOLDOWN: "재사용 대기시간 감소 (초)",
};

const EFFECT_ORDER = Object.keys(EFFECT_LABELS) as Effect[];

/** Main stat % conditions also count All Stats % lines. */
const COUNTS_ALL_STATS: Effect[] = ["STR%", "DEX%", "INT%", "LUK%"];

/** The effect an option line gives, or null for lines the calculator doesn't model. */
export function lineEffect(option: string): { effect: Effect; value: number } | null {
  const text = option.trim();
  for (const [re, effect] of EFFECT_PATTERNS) {
    const m = re.exec(text);
    if (m) return { effect, value: Number(m[1]) };
  }
  return null;
}

/** Effects that appear in the tables, with the values each one can roll (for the condition inputs). */
export function effectsIn(lines: LineOption[][]): { effect: Effect; values: number[] }[] {
  const values = new Map<Effect, Set<number>>();
  for (const line of lines)
    for (const o of line) {
      const e = lineEffect(o.option);
      if (e) values.set(e.effect, (values.get(e.effect) ?? new Set()).add(e.value));
    }
  return EFFECT_ORDER.filter((e) => values.has(e)).map((effect) => ({
    effect,
    values: [...values.get(effect)!].sort((a, b) => a - b),
  }));
}

/** One line of an option set: the effect's total over the 3 lines must be at least `min`. */
export type OptionCondition = { effect: Effect; min: number };
/** Up to 3 conditions that must all hold. Sets are alternatives: any one of them is a success. */
export type OptionSet = OptionCondition[];

export type MatchedCase = {
  /** the option text on line 1, 2, 3 */
  options: [string, string, string];
  /** chance of this exact combination, as a fraction */
  p: number;
  /** whether a limit rule rescaled line 2 or 3 */
  rescaled: boolean;
  /** indexes of the sets it satisfies */
  sets: number[];
};

export type OptionMatch = {
  /** chance that one cube satisfies at least one set, as a fraction */
  p: number;
  /** every combination that does, most likely first */
  cases: MatchedCase[];
  /** chance of each set on its own */
  setChances: number[];
};

/** Same effect twice in a set = one condition on the total (boss 40 + boss 40 → boss ≥ 80). */
function mergeConditions(set: OptionSet): OptionCondition[] {
  const total = new Map<Effect, number>();
  for (const c of set) total.set(c.effect, (total.get(c.effect) ?? 0) + c.min);
  return [...total].map(([effect, min]) => ({ effect, min }));
}

type Rolled = { option: string; probability: number; effect: ReturnType<typeof lineEffect>; limits: number[] };

function prepare(line: LineOption[]): Rolled[] {
  return line.map((o) => ({
    ...o,
    effect: lineEffect(o.option),
    limits: OPTION_LIMITS.flatMap((l, i) => (l.pattern.test(o.option) ? [i] : [])),
  }));
}

/** Chances (fractions) of each option on a line, given the options already on earlier lines. */
function lineChances(line: Rolled[], earlier: Rolled[]): { chances: number[]; rescaled: boolean } {
  const used = OPTION_LIMITS.map((_, i) => earlier.filter((o) => o.limits.includes(i)).length);
  const blocked = (o: Rolled) => o.limits.some((i) => used[i] >= OPTION_LIMITS[i].max);
  const excluded = line.reduce((sum, o) => sum + (blocked(o) ? o.probability : 0), 0);
  if (excluded === 0) return { chances: line.map((o) => o.probability / 100), rescaled: false };
  const rest = 100 - excluded;
  return { chances: line.map((o) => (blocked(o) || rest <= 0 ? 0 : o.probability / rest)), rescaled: true };
}

function satisfies(conditions: OptionCondition[], picked: Rolled[]): boolean {
  return conditions.every(({ effect, min }) => {
    let total = 0;
    for (const o of picked) {
      if (!o.effect) continue;
      if (o.effect.effect === effect || (o.effect.effect === "ALL%" && COUNTS_ALL_STATS.includes(effect)))
        total += o.effect.value;
    }
    return total >= min;
  });
}

/**
 * Chance that one cube rolls lines satisfying at least one of `sets`, and every combination that
 * does. `lines` are the 3 line tables of the probability search; fewer than 3 = no data (chance 0).
 */
export function matchOptions(lines: LineOption[][], sets: OptionSet[]): OptionMatch {
  // sets without conditions never match (an empty set would otherwise match everything)
  const active = sets.map((set, index) => ({ index, conditions: mergeConditions(set) })).filter((s) => s.conditions.length > 0);
  const empty = { p: 0, cases: [], setChances: sets.map(() => 0) };
  if (lines.length < 3 || active.length === 0) return empty;

  const [l1, l2, l3] = lines.map(prepare);
  const setChances = sets.map(() => 0);
  const cases: MatchedCase[] = [];
  let p = 0;

  const c1 = lineChances(l1, []);
  l1.forEach((a, i) => {
    const pa = c1.chances[i];
    if (pa === 0) return;
    const c2 = lineChances(l2, [a]);
    l2.forEach((b, j) => {
      const pab = pa * c2.chances[j];
      if (pab === 0) return;
      const c3 = lineChances(l3, [a, b]);
      l3.forEach((c, k) => {
        const pabc = pab * c3.chances[k];
        if (pabc === 0) return;
        const picked = [a, b, c];
        const met = active.flatMap((s) => (satisfies(s.conditions, picked) ? [s.index] : []));
        if (met.length === 0) return;
        for (const s of met) setChances[s] += pabc;
        p += pabc;
        cases.push({ options: [a.option, b.option, c.option], p: pabc, rescaled: c2.rescaled || c3.rescaled, sets: met });
      });
    });
  });

  cases.sort((x, y) => y.p - x.p);
  return { p, cases, setChances };
}

/** The probability search's part for an item category (`tier2` / `tier3` labels), if it has one. */
export function partOfCategory(tier2: string | undefined, tier3: string | undefined): Part | undefined {
  if (tier2 === "Secondary Weapon") return "WEAPON_SECONDARY";
  if (tier2 && /weapon/i.test(tier2)) return "WEAPON";
  return PARTS.find((p) => "tier3" in p && p.tier3 === tier3)?.part;
}
