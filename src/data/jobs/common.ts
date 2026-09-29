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
    // Seasonal event buff (보약 버프). Included in the API stat snapshot while the season runs.
    id: "season-tonic",
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
    description: "공/마 +10, 올스탯 +20, 보스 데미지 +15%, 방어율 무시 +15%, 크리티컬 확률 +15%, 버프 지속시간 +25%",
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
