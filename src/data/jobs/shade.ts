import type { JobData } from "./types";

// Shade (Hero Pirate 4th job, jobCode 2513 in MSU API). Main STR / sub DEX / Attack Power —
// checked against OrangeBarn (Lv.225): apStat STR 14,944, DEX 3,052, ATT 1,386 vs Magic ATT 286.
// Skill values come from each skill's effect text at the character's current level (/skills).
export const shade: JobData = {
  jobCodes: [2005, 2500, 2510, 2511, 2512, 2513],
  name: "Shade",
  mainStat: "STR",
  subStats: ["DEX"],
  attackType: "ATT",
  base: [{ stat: "CRIT%", value: 5 }],
  passives: [
    { name: "Cosmic Balance", pick: ["HP%", "MP%"] },
    { name: "Fox God's Favor", pick: ["ATT", "DMG%"], passiveOnly: true },
    { name: "Foxy Courage", pick: ["DMG%", "CRIT%"] },
    { name: "Knuckle Mastery", pick: ["CRIT%"] },
    { name: "Strength Training", pick: ["STR"] },
    { name: "Total Harmony", pick: ["ATT", "DMG%", "CDMG%"] },
    { name: "Spirit Bond 3", pick: ["FD%", "BOSS%"] },
    { name: "Weaken", pick: ["IED%"] },
    { name: "Spirit Bond 4", pick: ["IED%", "BOSS%"] },
    { name: "Advanced Knuckle Mastery", pick: ["FD%"] },
    { name: "Critical Insight", pick: ["CRIT%", "CDMG%", "FD%"] },
    { name: "Loaded Dice", pick: ["ATT"], passiveOnly: true },
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
  ],
};
