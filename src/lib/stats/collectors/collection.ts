import type { MainStat, StatContribution } from "../types";
import { inputContributions, type InputKey } from "./inputs";

/**
 * User-entered collection (도감) totals. The in-game stat window (API apStat) includes them,
 * but the API doesn't say how much, so they are typed in.
 * ALL = flat all stats, ATT = flat ATT and Magic ATT, MainStat keys = flat stat.
 */
export type CollectionInput = Partial<Record<"ALL" | "ATT" | MainStat | "BOSS%" | "CDMG%" | "CRIT%" | "IED%" | "DMG%", number>>;

export const COLLECTION_LABEL = "도감";

// Collection flat stats are treated like equipment flat stats (multiplied by stat %).
// If in-game testing shows otherwise, map them to `${stat}_FIXED` here.
const toInputKey = (key: keyof CollectionInput): InputKey => (key === "ATT" ? "ATT_MATT" : key);

export function collectCollection(input: CollectionInput): StatContribution[] {
  return (Object.entries(input) as [keyof CollectionInput, number | undefined][]).flatMap(([key, value]) =>
    inputContributions(toInputKey(key), value ?? 0, "collection", COLLECTION_LABEL),
  );
}
