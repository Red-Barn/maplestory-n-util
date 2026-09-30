import { HYPER_MAX_LEVEL } from "@/data/hyperStats";
import type { ChoiceInput } from "@/lib/stats";
import type { CharacterDetail } from "@/types/msu";

// Hyper stat points needed to raise a stat to each level (index 0 = Lv.0 → Lv.1), the same for
// every stat. This is the KMS/GMS table — MapleStory N's own table is not published, so it still
// needs an in-game check. It fits the four fixtures: the points their API presets cost stay within
// what their level gives on the same servers (3 per level from Lv.140, +1 every 10 levels):
// BrownBarn 583/586, OrangeBarn 582/586, RedBarn 810/815. See docs/calc/hyper.md.
export const HYPER_LEVEL_COST = [1, 2, 4, 8, 10, 15, 20, 25, 30, 35, 50, 65, 80, 95, 110];

/** Hyper stat level per stat id; missing = 0. */
export type HyperLevels = Record<string, number>;

const CUMULATIVE = HYPER_LEVEL_COST.reduce<number[]>((acc, cost) => [...acc, acc[acc.length - 1] + cost], [0]);

/** Points spent on one stat at `level` (0 at Lv.0, 150 at Lv.10, 550 at Lv.15). */
export const cumulativeCost = (level: number): number =>
  CUMULATIVE[Math.max(0, Math.min(Math.floor(level), HYPER_MAX_LEVEL))];

export const spentPoints = (levels: HyperLevels): number =>
  Object.values(levels).reduce((sum, level) => sum + cumulativeCost(level), 0);

/** Points the API preset uses, on every hyper stat — also the ones that don't change damage. */
export const apiSpentPoints = (character: CharacterDetail): number =>
  spentPoints(Object.fromEntries(Object.entries(character.hyperStat).map(([id, h]) => [id, h?.level ?? 0])));

/** Levels of a preset as the stat panel stores it ("" = Lv.0), and back. */
export const levelsFromInput = (input: ChoiceInput): HyperLevels =>
  Object.fromEntries(Object.entries(input).map(([id, level]) => [id, Number(level) || 0]));

export const inputFromLevels = (levels: HyperLevels): ChoiceInput =>
  Object.fromEntries(Object.entries(levels).map(([id, level]) => [id, level > 0 ? String(level) : ""]));
