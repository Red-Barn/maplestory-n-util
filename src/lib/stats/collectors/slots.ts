import { ABILITY_LINES, ABILITY_TYPES, type AbilityType } from "@/data/abilities";
import { HYPER_STATS } from "@/data/hyperStats";
import type { CharacterDetail } from "@/types/msu";
import { parseOption } from "../parseOption";
import { effectsForJob, type JobView } from "../relevance";
import { MAIN_STATS, type StatContribution } from "../types";
import type { ChoiceInput } from "./choices";
import { inputContributions } from "./inputs";

// Hyper stat and ability presets. The API returns only the preset in use ("api"); presets
// 1–3 are entered by the user and start as a copy of the API one.

export const API_PRESET = "api";
export const PRESET_SLOTS = ["1", "2", "3"];

/** The API hyper stat levels as a level choice per stat (see HYPER_STATS). */
export function apiHyperInput(character: CharacterDetail): ChoiceInput {
  return Object.fromEntries(
    HYPER_STATS.map((d) => {
      const level = character.hyperStat[d.id]?.level ?? 0;
      return [d.id, level > 0 ? String(level) : ""];
    }),
  );
}

export type AbilityLine = { type: string; value?: number };

const isMain = (stat: string) => (MAIN_STATS as readonly string[]).includes(stat);

/** Best match of an API ability line among ABILITY_TYPES; "" when it doesn't change the stat table. */
function toAbilityLine(desc: string): AbilityLine {
  const effects = parseOption(desc);
  const [first, second] = effects;
  let type = "";
  if (effects.length === 4 && effects.every((e) => isMain(e.stat))) type = "ALL";
  else if (effects.length === 2 && isMain(first.stat) && isMain(second.stat)) type = `${first.stat}+${second.stat}`;
  else if (effects.length === 1) type = first.stat;
  return ABILITY_TYPES.some((t) => t.id === type) ? { type, value: first.value } : { type: "" };
}

export function apiAbilityLines(character: CharacterDetail): AbilityLine[] {
  const lines = Object.values(character.ability).map((a) => (a ? toAbilityLine(a.desc) : { type: "" }));
  return Array.from({ length: ABILITY_LINES }, (_, i) => lines[i] ?? { type: "" });
}

export function collectAbilityLines(lines: AbilityLine[], label: string): StatContribution[] {
  return lines.flatMap((line) => {
    const type = ABILITY_TYPES.find((t) => t.id === line.type);
    if (!type || !line.value) return [];
    return type.effects(line.value).flatMap((e) => inputContributions(e.key, e.value, "ability", label));
  });
}

/** Ability kinds that do something for the job, plus `keep` (kinds already chosen). */
export function abilityTypesForJob(job: JobView | undefined, keep: string[] = []): AbilityType[] {
  return ABILITY_TYPES.filter((t) => keep.includes(t.id) || effectsForJob(t.effects(2), job).length > 0);
}
