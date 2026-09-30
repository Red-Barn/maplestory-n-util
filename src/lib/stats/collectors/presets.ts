import type { StatContribution, StatSource } from "../types";
import { inputContributions, type InputKey } from "./inputs";

/**
 * A user-toggleable bundle of fixed effects the API includes in its stat snapshot but doesn't list
 * (link skills, titles, arrows, ...). Values can be edited per character.
 */
export type PresetEffect = { key: InputKey; value: number };
export type PresetDef = {
  id: string;
  name: string;
  /** e.g. "Lv.6", "칭호" */
  tag?: string;
  effects: PresetEffect[];
  /** API job names that can use it (e.g. arrows for bow users); omitted = every job. */
  onlyJobs?: string[];
};

/**
 * Per-preset on/off and edited values (index-aligned with the definition's effects).
 * `value` is the single-effect format saved before presets could have several effects.
 */
export type PresetState = { on: boolean; values?: (number | undefined)[]; value?: number };
export type PresetInput = Record<string, PresetState>;

export const defaultPresetInput = (defs: PresetDef[]): PresetInput =>
  Object.fromEntries(defs.map((d) => [d.id, { on: true }]));

/** Current value of a preset's i-th effect. */
export function presetValue(def: PresetDef, state: PresetState | undefined, i: number): number {
  return state?.values?.[i] ?? (i === 0 ? state?.value : undefined) ?? def.effects[i].value;
}

export function collectPresets(defs: PresetDef[], input: PresetInput, source: StatSource): StatContribution[] {
  return defs.flatMap((d) => {
    const state = input[d.id];
    if (state && !state.on) return [];
    const label = d.tag ? `${d.name} ${d.tag}` : d.name;
    return d.effects.flatMap((e, i) => inputContributions(e.key, presetValue(d, state, i), source, label));
  });
}
