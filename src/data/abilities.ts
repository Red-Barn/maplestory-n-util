import type { PresetEffect } from "@/lib/stats/collectors/presets";
import { MAIN_STATS } from "@/lib/stats/types";

// Ability line kinds for presets the user enters by hand (the API only returns the preset in use).
// Only lines that change the stat table; anything else is "기타".

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

// "DEX: +26, INT: +13" — the second stat is half the first
const PAIRS: AbilityType[] = MAIN_STATS.flatMap((a) =>
  MAIN_STATS.filter((b) => b !== a).map((b) => ({
    id: `${a}+${b}`,
    label: `${a} + ${b} 절반`,
    effects: (value: number) => [
      { key: a, value },
      { key: b, value: Math.floor(value / 2) },
    ],
  })),
);

export const ABILITY_TYPES: AbilityType[] = [
  ...MAIN_STATS.map((s) => single(s, s)),
  single("ALL", "올스탯"),
  single("ATT", "공격력"),
  single("MATT", "마력"),
  single("BOSS%", "보스 데미지", true),
  single("CRIT%", "크리티컬 확률", true),
  ...PAIRS,
];

export const ABILITY_LINES = 3;
