import { leveledChoice, type ChoiceDef } from "@/lib/stats/collectors/choices";
import type { PresetEffect } from "@/lib/stats/collectors/presets";

// Hyper stat totals per level, for presets the user enters by hand (the API only returns the
// preset in use). Ids are the API's hyperStat field names. Only stats the stat table shows.
// Checked against API descriptions: linear ones at several levels, boss damage at Lv.10/11/13
// (35/39/47%), critical rate at Lv.1/4 (1/4%). Critical rate above Lv.5 and levels above 13 follow
// the usual table (+2% per level from Lv.6) and are not yet confirmed in-game.
export const HYPER_MAX_LEVEL = 15;

const levels = Array.from({ length: HYPER_MAX_LEVEL }, (_, i) => i + 1);
const linear = (per: number) => (level: number) => per * level;
/** `low` per level up to Lv.5, `high` per level after. */
const stepped = (low: number, high: number) => (level: number) => low * Math.min(level, 5) + high * Math.max(level - 5, 0);

const hyper = (id: string, name: string, key: PresetEffect["key"], total: (level: number) => number): ChoiceDef =>
  leveledChoice(
    id,
    name,
    levels.map((level) => [{ key, value: total(level) }]),
    0,
  );

// Main stats from hyper stats are not multiplied by stat %.
export const HYPER_STATS: ChoiceDef[] = [
  hyper("str", "STR", "STR_FIXED", linear(30)),
  hyper("dex", "DEX", "DEX_FIXED", linear(30)),
  hyper("int", "INT", "INT_FIXED", linear(30)),
  hyper("luk", "LUK", "LUK_FIXED", linear(30)),
  hyper("attackAndMagicAttack", "공격력/마력", "ATT_MATT", linear(3)),
  hyper("damage", "데미지", "DMG%", linear(3)),
  hyper("bossMonsterDamage", "보스 데미지", "BOSS%", stepped(3, 4)),
  hyper("ignoreDefence", "방어율 무시", "IED%", linear(3)),
  hyper("criticalRate", "크리티컬 확률", "CRIT%", stepped(1, 2)),
  hyper("criticalDamage", "크리티컬 데미지", "CDMG%", linear(1)),
];
