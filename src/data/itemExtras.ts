import type { StatEffect } from "@/lib/stats/types";

// Item effects that neither the item detail nor the game metadata report, keyed by item name.
// Values confirmed in-game by the user.
export const ITEM_EXTRAS: Record<string, StatEffect[]> = {
  // metadata already has all stats +3 / ATT & Magic ATT +3
  "Pivotal Adventure Ring": [
    { stat: "CRIT%", value: 15 },
    { stat: "CDMG%", value: 3 },
  ],
};
