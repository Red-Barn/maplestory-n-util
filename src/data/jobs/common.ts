import type { BuffDef, SkillRef } from "./types";

// Skills every class gets (IDs differ per class prefix, so they are matched by name).

/** Blessing of the Fairy and Empress's Blessing don't stack — only the stronger applies. */
export const EXCLUSIVE_BLESSINGS: SkillRef[] = [
  { name: "Blessing of the Fairy", pick: ["ATT", "MATT"] },
  { name: "Empress's Blessing", pick: ["ATT", "MATT"] },
];

export const COMMON_PASSIVES: SkillRef[] = [
  { name: "Will of the Alliance", pick: ["STR", "DEX", "INT", "LUK", "ATT", "MATT"] },
  // 5th job common skill: "[Passive Effect - All Stats: +8]"
  { name: "Rope Lift", pick: ["STR", "DEX", "INT", "LUK"] },
];

export const COMMON_BUFFS: BuffDef[] = [
  {
    id: "echo-of-hero",
    name: "Echo of Hero",
    skills: [
      { name: "Echo of Hero", pick: ["ATT%", "MATT%"] },
      { name: "Hero's Echo", pick: ["ATT%", "MATT%"] },
    ],
    defaultOn: true,
  },
];
