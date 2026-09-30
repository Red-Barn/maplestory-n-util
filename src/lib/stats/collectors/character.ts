import type { CharacterDetail } from "@/types/msu";
import { parseOption } from "../parseOption";
import { MAIN_STATS, type MainStat, type StatContribution, type StatKey } from "../types";

// Hyper stat, ability and arcane symbol main stats are not multiplied by stat %.
const toFixed = (stat: StatKey): StatKey =>
  (MAIN_STATS as readonly string[]).includes(stat) ? (`${stat as MainStat}_FIXED` as StatKey) : stat;

export function collectHyperStats(character: CharacterDetail): StatContribution[] {
  return Object.values(character.hyperStat)
    .filter((h) => h && h.level > 0)
    .flatMap((h) =>
      parseOption(h!.desc).map((e) => ({ stat: toFixed(e.stat), value: e.value, source: "hyper" as const, label: h!.desc })),
    );
}

export function collectAbility(character: CharacterDetail): StatContribution[] {
  return Object.values(character.ability)
    .filter((a) => a != null)
    .flatMap((a) =>
      parseOption(a.desc).map((e) => ({ stat: toFixed(e.stat), value: e.value, source: "ability" as const, label: a.desc })),
    );
}

export function collectArcane(character: CharacterDetail): StatContribution[] {
  const map: Record<string, StatKey> = { str: "STR_FIXED", dex: "DEX_FIXED", int: "INT_FIXED", luk: "LUK_FIXED", hp: "HP" };
  return character.wearing.arcaneSymbols.slots
    .filter((s) => s.itemId)
    .flatMap((s) =>
      Object.entries(s.stat).map(([k, v]) => ({
        stat: map[k],
        value: v ?? 0,
        source: "arcane" as const,
        label: `Arcane Symbol Lv.${s.level} (${s.itemId})`,
      })),
    )
    .filter((c) => c.stat);
}

// Pet ATT & Magic ATT by number of pets (total, not per pet), and per pet equipment.
// Confirmed in-game by the user.
const PET_ATT_BY_COUNT = [0, 3, 14, 30];
const PET_EQUIP_ATT = 5;
export const MAX_PETS = 3;

/** Pets the API lists. Only the starting value — the user sets the number on the character page. */
export const apiPetCount = (character: CharacterDetail): number =>
  Math.min(Object.values(character.wearing.pet ?? {}).filter((p) => p?.itemId).length, MAX_PETS);

/** ATT & Magic ATT from `count` pets. A pet and its equipment count as one set. */
export const petAtt = (count: number): number => PET_ATT_BY_COUNT[count] + count * PET_EQUIP_ATT;

export function collectPets(count: number): StatContribution[] {
  const pets = Math.max(0, Math.min(Math.floor(count), MAX_PETS));
  if (!pets) return [];
  const out: StatContribution[] = [];
  for (const stat of ["ATT", "MATT"] as const) {
    out.push({ stat, value: PET_ATT_BY_COUNT[pets], source: "pet", label: `펫 ${pets}마리` });
    out.push({ stat, value: pets * PET_EQUIP_ATT, source: "pet", label: `펫장비 ${pets}개` });
  }
  return out;
}
