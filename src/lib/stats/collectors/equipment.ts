import { ITEM_EXTRAS } from "@/data/itemExtras";
import type { ItemDetail, PotentialLines, StatBreakdown } from "@/types/msu";
import { parseOption } from "../parseOption";
import type { StatContribution, StatKey, StatSource } from "../types";

// ItemStats field → StatKey. `base/enhance/extra` = item base / starforce+scrolls / flame.
const FLAT_FIELDS: [keyof ItemDetail["stats"], StatKey][] = [
  ["str", "STR"],
  ["dex", "DEX"],
  ["int", "INT"],
  ["luk", "LUK"],
  ["maxHp", "HP"],
  ["maxMp", "MP"],
  ["pad", "ATT"],
  ["mad", "MATT"],
  ["statr", "ALL%"],
  ["bdr", "BOSS%"],
  ["damr", "DMG%"],
  ["imdr", "IED%"],
  ["maxHpr", "HP%"],
  ["maxMpr", "MP%"],
];

const PARTS: [keyof Omit<StatBreakdown, "total">, StatSource][] = [
  ["base", "equip-base"],
  ["enhance", "starforce"],
  ["extra", "flame"],
];

function potentialLines(lines: PotentialLines, source: StatSource, label: string, level: number): StatContribution[] {
  if (!lines) return [];
  return [lines.option1, lines.option2, lines.option3]
    .filter((o) => o != null)
    .flatMap((o) => parseOption(o.label, { level }).map((e) => ({ ...e, source, label: `${label} (${o.label})` })));
}

export function collectItem(item: ItemDetail, level: number): StatContribution[] {
  const out: StatContribution[] = [];
  const label = item.name;
  for (const [field, stat] of FLAT_FIELDS) {
    const b = item.stats[field] as StatBreakdown | null | undefined;
    if (!b) continue;
    for (const [part, source] of PARTS) {
      if (b[part]) out.push({ source, label, stat, value: b[part] });
    }
  }
  out.push(...potentialLines(item.enhance.potential, "potential", label, level));
  out.push(...potentialLines(item.enhance.bonusPotential, "bonus-potential", label, level));
  for (const e of ITEM_EXTRAS[item.name] ?? []) out.push({ ...e, source: "equip-base", label: `${label} (고유 효과)` });
  return out;
}

export function collectEquipment(items: Record<string, ItemDetail | null>, level: number): StatContribution[] {
  return Object.values(items).flatMap((item) => (item ? collectItem(item, level) : []));
}
