import type { JobData } from "./types";

// Aran (Hero Warrior 4th job, jobCode 2113 in MSU API). Main STR / sub DEX / Attack Power —
// checked against BrownBarn (Lv.225): apStat STR 14,900, DEX 3,086, ATT 1,543 vs Magic ATT 242.
// Skill values come from each skill's effect text at the character's current level (/skills).
export const aran: JobData = {
  jobCodes: [2000, 2100, 2110, 2111, 2112, 2113],
  name: "Aran",
  mainStat: "STR",
  subStats: ["DEX"],
  attackType: "ATT",
  apBonus: 23, // main stat AP = 5 × level + 23, confirmed in-game by the user
  base: [{ stat: "CRIT%", value: 5 }],
  passives: [
    { name: "Regained Memory", pick: ["ATT%"] },
    { name: "Agile Polearms", pick: ["STR"] },
    { name: "Ol' Reliable", pick: ["ATT", "CRIT%"] },
    { name: "Polearm Mastery", pick: ["FD%"] },
    { name: "Physical Training", pick: ["STR", "DEX"] },
    // the rest of the text is the combo stacking rule, see Advanced Combo Ability
    { name: "Combo Ability", pick: ["CRIT%"], passiveOnly: true },
    { name: "Drain", pick: ["HP%"], passiveOnly: true },
    // outside the passive bracket is the conditional "+10% on slowed enemies"
    { name: "Snow Charge", pick: ["DMG%"], passiveOnly: true },
    {
      // "Combo Ability stacking effects are always applied to the max": ATT +2 per 50 combos,
      // up to 10 stacks (Combo Ability text) → ATT +20. Not yet checked in-game.
      name: "Advanced Combo Ability",
      pick: ["ATT", "CDMG%"],
      effects: [{ stat: "ATT", value: 20 }],
    },
    { name: "Might", pick: ["ATT", "CRIT%", "BOSS%"] },
    { name: "High Mastery", pick: ["ATT", "CDMG%", "FD%"] },
    { name: "Advanced Final Attack", pick: ["ATT"] },
    { name: "Cleaving Attack", pick: ["IED%", "DMG%"] },
  ],
  // Skill buffs are not in the API stat snapshot, so all start unchecked.
  buffs: [
    {
      id: "maple-warrior",
      name: "Maple Warrior",
      skills: [{ name: "Maple Warrior", pick: [] }],
      effects: [{ stat: "AP%", value: 15 }],
      defaultOn: false,
    },
    {
      id: "maha-blessing",
      name: "Maha Blessing",
      skills: [{ name: "Maha Blessing", pick: ["ATT", "MATT"] }],
      defaultOn: false,
    },
    {
      id: "weapon-aura",
      name: "Weapon Aura",
      skills: [{ name: "Weapon Aura", pick: ["IED%", "FD%"] }],
      defaultOn: false,
    },
  ],
};
