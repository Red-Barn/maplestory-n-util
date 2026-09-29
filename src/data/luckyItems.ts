// Lucky items count as one extra piece of every equipment set the character already wears 3+
// pieces of. Accessory-only sets (boss accessories, Seven Days) don't get it.
// Matched by item name (confirmed in-game by the user).
export const LUCKY_ITEMS = new Set([
  "Chaos Pierre Hat",
  "Chaos Von Bon Helmet",
  "Chaos Queen's Tiara",
  "Chaos Vellum's Helm",
]);

/** Minimum equipped pieces of a set for a lucky item to join it. */
export const LUCKY_MIN_PIECES = 3;
