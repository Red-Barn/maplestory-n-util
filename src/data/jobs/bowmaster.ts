import type { JobData } from "./types";

// Bowmaster (Explorer Bowman 4th job, jobCode 313 in MSU API).
// Skill values come from each skill's effect text at the character's current level (/skills),
// so only which stats to take is listed here. Checked against RedBarn (Lv.244) in-game stat window.
export const bowmaster: JobData = {
  jobCodes: [300, 310, 311, 312, 313],
  name: "Bowmaster",
  mainStat: "DEX",
  subStats: ["STR"],
  attackType: "ATT",
  base: [{ stat: "CRIT%", value: 5 }],
  passives: [
    { name: "Critical Shot", pick: ["CRIT%"] },
    { name: "Bow Acceleration", pick: ["DEX"] },
    { name: "Physical Training", pick: ["STR", "DEX"] },
    { name: "Soul Arrow: Bow", pick: ["ATT"] },
    { name: "Evasion Boost", pick: ["HP%"] },
    // "ignores 25% of monster's Weapon DEF. Attack Power: +25%" — the DEF part is IED (user-confirmed)
    { name: "Marksmanship", pick: ["ATT%", "IED%"] },
    { name: "Reckless Hunt: Bow", pick: ["ATT", "FD%"] },
    { name: "Bow Expert", pick: ["ATT", "CDMG%"] },
    { name: "Illusion Step", pick: ["DEX"] },
    { name: "Advanced Final Attack", pick: ["ATT"] },
    { name: "Armor Break", pick: ["IED%"] },
    { name: "Enchanted Quiver", pick: ["FD%"] },
  ],
  // Maple Warrior / Sharp Eyes are not in the API stat snapshot, so all buffs start unchecked.
  buffs: [
    {
      id: "maple-warrior",
      name: "Maple Warrior",
      // "Increases all stats assigned APs by 15%" at Lv.30; the text isn't a "<stat>: +N" form
      skills: [{ name: "Maple Warrior", pick: [] }],
      effects: [{ stat: "AP%", value: 15 }],
      defaultOn: false,
    },
    {
      id: "sharp-eyes",
      name: "Sharp Eyes",
      skills: [
        { name: "Sharp Eyes", pick: ["CRIT%", "CDMG%"] },
        { name: "Sharp Eyes - Guardbreak", pick: ["IED%"] },
        { name: "Sharp Eyes - Critical Chance", pick: ["CRIT%"] },
      ],
      defaultOn: false,
    },
    {
      id: "quiver-barrage",
      name: "Quiver Barrage",
      skills: [{ name: "Quiver Barrage", pick: ["ATT%"] }],
      defaultOn: false,
    },
    {
      id: "storm-of-arrows",
      name: "Storm of Arrows",
      skills: [{ name: "Storm of Arrows", pick: ["DMG%"] }],
      defaultOn: false,
    },
  ],
};
