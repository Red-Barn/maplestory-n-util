import { MAIN_STATS, type StatContribution, type StatKey, type StatSource } from "../types";

/**
 * Keys for user-entered stats. Besides plain StatKeys:
 * ALL = flat all stats, ATT_MATT = flat ATT and Magic ATT together.
 */
export type InputKey = StatKey | "ALL" | "ATT_MATT";

export function expandInput(key: InputKey): StatKey[] {
  if (key === "ALL") return [...MAIN_STATS];
  if (key === "ATT_MATT") return ["ATT", "MATT"];
  return [key];
}

export function inputContributions(key: InputKey, value: number, source: StatSource, label: string): StatContribution[] {
  if (!value) return [];
  return expandInput(key).map((stat) => ({ stat, value, source, label }));
}
