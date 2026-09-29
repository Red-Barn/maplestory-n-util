import type { MainStat, StatContribution } from "../types";

/** User-entered union raider stats (the API doesn't expose union). */
export type UnionInput = Partial<Record<MainStat, number>>;

export const UNION_LABEL = "유니온 공격대원";

// Union raider stats are not multiplied by stat %, like hyper stats and arcane symbols.
export function collectUnion(input: UnionInput): StatContribution[] {
  return Object.entries(input)
    .filter(([, v]) => v)
    .map(([stat, value]) => ({
      stat: `${stat as MainStat}_FIXED` as const,
      value: value!,
      source: "union" as const,
      label: UNION_LABEL,
    }));
}
