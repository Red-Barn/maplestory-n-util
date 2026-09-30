import type { StatContribution } from "../types";
import { inputContributions } from "./inputs";

export const COLLECTION_SET_LABEL = "도감 세트 효과";

/**
 * All stats from collection set effects, typed in by the user (the tier itself is a dropdown,
 * see src/data/collection.ts). Treated like other flat all stats (multiplied by stat %).
 */
export function collectCollectionSet(allStats: number | undefined): StatContribution[] {
  return inputContributions("ALL", allStats ?? 0, "collection", COLLECTION_SET_LABEL);
}
