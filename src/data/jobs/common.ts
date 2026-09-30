import type { BuffDef, SkillRef } from "./types";

// Skills every class gets (IDs differ per class prefix, so they are matched by name).

/** Blessing of the Fairy and Empress's Blessing don't stack — only the stronger applies. */
export const EXCLUSIVE_BLESSINGS: SkillRef[] = [
  { name: "Blessing of the Fairy", pick: ["ATT", "MATT"] },
  { name: "Empress's Blessing", pick: ["ATT", "MATT"] },
];

/**
 * The API lists Empress's Blessing for some classes only (Bowmaster yes; Aran and Shade no, though
 * they have it in-game), so where it's missing the user picks the level on the character page.
 * ATT & Magic ATT = level (Lv.30 → +30 from the API text; lower levels assumed linear).
 * The default is the user's current level.
 */
export const EMPRESS_BLESSING = { name: "Empress's Blessing", maxLevel: 30, defaultLevel: 30 };

export const COMMON_PASSIVES: SkillRef[] = [
  { name: "Will of the Alliance", pick: ["STR", "DEX", "INT", "LUK", "ATT", "MATT"] },
  // 5th job common skill: "[Passive Effect - All Stats: +8]"
  { name: "Rope Lift", pick: ["STR", "DEX", "INT", "LUK"] },
  // "[Passive Effect - All Stats: +1]"
  { name: "Decent Sharp Eyes", pick: ["STR", "DEX", "INT", "LUK"], passiveOnly: true },
  { name: "Decent Speed Infusion", pick: ["STR", "DEX", "INT", "LUK"], passiveOnly: true },
];

export const SEASON_BUFF_ID = "season-tonic";

export const COMMON_BUFFS: BuffDef[] = [
  {
    // Seasonal event buff (보약 버프). The API stat snapshot includes it for characters that have
    // it on; the stat panel asks per character (set on the character list) instead of assuming.
    id: SEASON_BUFF_ID,
    name: "시즌 버프 (보약)",
    effects: [
      { stat: "ATT", value: 10 },
      { stat: "MATT", value: 10 },
      { stat: "STR", value: 20 },
      { stat: "DEX", value: 20 },
      { stat: "INT", value: 20 },
      { stat: "LUK", value: 20 },
      { stat: "BOSS%", value: 15 },
      { stat: "IED%", value: 15 },
      { stat: "CRIT%", value: 15 },
    ],
    note: "버프 지속시간 +25%",
    defaultOn: true,
  },
  {
    id: "echo-of-hero",
    name: "Echo of Hero",
    skills: [
      { name: "Echo of Hero", pick: ["ATT%", "MATT%"] },
      { name: "Hero's Echo", pick: ["ATT%", "MATT%"] },
    ],
    defaultOn: false, // not in the API snapshot
  },
];
