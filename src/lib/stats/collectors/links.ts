import type { LinkSkillDef } from "@/data/links";
import type { StatContribution } from "../types";
import { inputContributions } from "./inputs";

/**
 * Per-link on/off and edited values (index-aligned with the definition's effects).
 * `value` is the single-effect format saved before links could have several effects.
 */
export type LinkState = { on: boolean; values?: (number | undefined)[]; value?: number };
export type LinkInput = Record<string, LinkState>;

export const defaultLinkInput = (defs: LinkSkillDef[]): LinkInput =>
  Object.fromEntries(defs.map((d) => [d.id, { on: true }]));

/** Current value of a link's i-th effect. */
export function linkValue(def: LinkSkillDef, state: LinkState | undefined, i: number): number {
  return state?.values?.[i] ?? (i === 0 ? state?.value : undefined) ?? def.effects[i].value;
}

export function collectLinks(defs: LinkSkillDef[], input: LinkInput): StatContribution[] {
  return defs.flatMap((d) => {
    const state = input[d.id];
    if (state && !state.on) return [];
    return d.effects.flatMap((e, i) =>
      inputContributions(e.key, linkValue(d, state, i), "link", `${d.name} Lv.${d.level}`),
    );
  });
}
