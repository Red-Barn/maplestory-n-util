import type { StatContribution, StatSource } from "../types";
import { inputContributions } from "./inputs";
import type { PresetEffect } from "./presets";

/**
 * A dropdown of fixed options (link skill level, collection tier, title). The API includes the
 * chosen one in its stat snapshot but doesn't say which it is, so the user picks it.
 */
export type ChoiceOption = { id: string; label: string; effects: PresetEffect[] };
export type ChoiceDef = { id: string; name: string; options: ChoiceOption[]; /** "" = none */ defaultOption: string };

/** Selected option id per choice; "" means none. */
export type ChoiceInput = Record<string, string>;

/** Options "1".."n" labelled with `label(level)`, from per-level effect rows. */
export function leveledOptions(rows: PresetEffect[][], label: (level: number) => string): ChoiceOption[] {
  return rows.map((effects, i) => ({ id: String(i + 1), label: label(i + 1), effects }));
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
