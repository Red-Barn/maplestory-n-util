import type { PresetEffect } from "@/lib/stats/collectors/presets";
import { MAIN_STATS, type MainStat } from "@/lib/stats/types";

// Ability line kinds for presets the user enters by hand (the API only returns the preset in use).
// Only lines that change the stat table; anything else is "기타".
// Main stats from abilities (single, pair or all stats) are not multiplied by stat %
// (confirmed in-game by the user), like hyper stats.

export type AbilityType = {
  id: string;
  label: string;
  pct?: boolean;
  effects: (value: number) => PresetEffect[];
};

const single = (id: PresetEffect["key"], label: string, pct?: boolean): AbilityType => ({
  id,
  label,
  pct,
  effects: (value) => [{ key: id, value }],
});

const mainStats = (id: string, label: string, stats: readonly MainStat[], share = (value: number) => value): AbilityType => ({
  id,
  label,
  effects: (value) => stats.map((s, i) => ({ key: `${s}_FIXED` as const, value: i === 0 ? value : share(value) })),
});

// "DEX: +26, INT: +13" — the second stat is half the first
const PAIRS: AbilityType[] = MAIN_STATS.flatMap((a) =>
  MAIN_STATS.filter((b) => b !== a).map((b) => mainStats(`${a}+${b}`, `${a} + ${b} 절반`, [a, b], (v) => Math.floor(v / 2))),
);

export const ABILITY_TYPES: AbilityType[] = [
  ...MAIN_STATS.map((s) => mainStats(s, s, [s])),
  mainStats("ALL", "올스탯", MAIN_STATS),
  single("ATT", "공격력"),
  single("MATT", "마력"),
  single("BOSS%", "보스 데미지", true),
  single("CRIT%", "크리티컬 확률", true),
  ...PAIRS,
];

export const ABILITY_LINES = 3;
