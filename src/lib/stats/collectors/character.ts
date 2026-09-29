import type { CharacterDetail } from "@/types/msu";
import { parseOption } from "../parseOption";
import { MAIN_STATS, type MainStat, type StatContribution, type StatKey } from "../types";

// Hyper stat and arcane symbol main stats are not multiplied by stat %.
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
    .flatMap((a) => parseOption(a.desc).map((e) => ({ ...e, source: "ability" as const, label: a.desc })));
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

export function collectPets(character: CharacterDetail): StatContribution[] {
  const pets = Object.values(character.wearing.pet ?? {}).filter((p) => p?.itemId);
  const equips = pets.filter((p) => p!.petAcc?.itemId).length;
  const petAtt = PET_ATT_BY_COUNT[Math.min(pets.length, 3)];
  const out: StatContribution[] = [];
  for (const stat of ["ATT", "MATT"] as const) {
    if (petAtt) out.push({ stat, value: petAtt, source: "pet", label: `펫 ${pets.length}마리` });
    if (equips) out.push({ stat, value: equips * PET_EQUIP_ATT, source: "pet", label: `펫장비 ${equips}개` });
  }
  return out;
}
