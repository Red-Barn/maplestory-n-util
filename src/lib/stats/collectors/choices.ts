import type { StatContribution, StatSource } from "../types";
import { inputContributions } from "./inputs";
import type { PresetEffect } from "./presets";

/**
 * A dropdown of fixed options (link skill level, collection tier, title). The API includes the
 * chosen one in its stat snapshot but doesn't say which it is, so the user picks it.
 */
export type ChoiceOption = { id: string; label: string; effects: PresetEffect[] };
export type ChoiceDef = {
  id: string;
  name: string;
  options: ChoiceOption[];
  /** "" = none */
  defaultOption: string;
  /** Label of the "none" entry, e.g. "Lv.0" or "없음". */
  noneLabel: string;
  /** Leveled choices show level 0 as the first level's stats at 0 (e.g. "크확 +0%"). */
  zeroEffects?: boolean;
};

/** Selected option id per choice; "" means none. */
export type ChoiceInput = Record<string, string>;

/**
 * A level dropdown "Lv.0".."Lv.n" from per-level effect rows (row i = level i + 1).
 * Lv.0 is the "none" entry and gives nothing.
 */
export function leveledChoice(id: string, name: string, rows: PresetEffect[][], defaultLevel: number): ChoiceDef {
  return {
    id,
    name,
    options: rows.map((effects, i) => ({ id: String(i + 1), label: `Lv.${i + 1}`, effects })),
    defaultOption: defaultLevel ? String(defaultLevel) : "",
    noneLabel: "Lv.0",
    zeroEffects: true,
  };
}

export const defaultChoiceInput = (defs: ChoiceDef[]): ChoiceInput =>
  Object.fromEntries(defs.map((d) => [d.id, d.defaultOption]));

export function selectedOption(def: ChoiceDef, input: ChoiceInput): ChoiceOption | undefined {
  const id = input[def.id] ?? def.defaultOption;
  return def.options.find((o) => o.id === id);
}

export function collectChoices(defs: ChoiceDef[], input: ChoiceInput, source: StatSource): StatContribution[] {
  return defs.flatMap((d) => {
    const option = selectedOption(d, input);
    if (!option) return [];
    return option.effects.flatMap((e) => inputContributions(e.key, e.value, source, `${d.name} ${option.label}`));
  });
}
