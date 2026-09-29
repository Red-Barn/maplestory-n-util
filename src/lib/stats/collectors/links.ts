import type { LinkSkillDef } from "@/data/links";
import type { StatContribution } from "../types";
import { inputContributions } from "./inputs";

/** Per-link on/off and value (defaults to the definition's value). */
export type LinkInput = Record<string, { on: boolean; value?: number }>;

export const defaultLinkInput = (defs: LinkSkillDef[]): LinkInput =>
  Object.fromEntries(defs.map((d) => [d.id, { on: true }]));

export function collectLinks(defs: LinkSkillDef[], input: LinkInput): StatContribution[] {
  return defs.flatMap((d) => {
    const state = input[d.id] ?? { on: true };
    if (!state.on) return [];
    return inputContributions(d.key, state.value ?? d.value, "link", `${d.name} Lv.${d.level}`);
  });
}
