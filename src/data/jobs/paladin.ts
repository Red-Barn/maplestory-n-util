import type { JobData } from "./types";

// Paladin (Explorer Warrior 4th job, jobCode 123 in MSU API). Main STR / sub DEX / Attack Power —
// checked against unjna (Lv.241): apStat STR 20,964, DEX 3,063, ATT 1,741 vs Magic ATT 367.
// Skill values come from each skill's effect text at the character's current level (/skills).
export const paladin: JobData = {
  jobCodes: [100, 120, 121, 122, 123],
  name: "Paladin",
  mainStat: "STR",
  subStats: ["DEX"],
  attackType: "ATT",
  base: [{ stat: "CRIT%", value: 5 }],
  passives: [
    { name: "Iron Body", pick: ["HP%"] },
    { name: "Agile Arms", pick: ["STR"] },
    { name: "Physical Training", pick: ["STR", "DEX"] },
    // "When shield or rosary is equipped -- ..., Attack Power: +10" (only with that secondary weapon)
    { name: "Shield Mastery", pick: ["ATT"] },
    // plus one "... when equipped with a <weapon type>" line, kept only for the equipped weapon
    { name: "High Paladin", pick: ["CRIT%", "CDMG%", "IED%", "FD%"] },
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
      // Per Light Charge: "Damage and HP Recovery: +5%, Attack Power +12", up to 5 charges
      // (Vessel of Light text). Taken as replacing Vessel of Light's own per-charge values;
      // not yet checked in-game.
      id: "light-charge",
      name: "Light Charge ×5",
      skills: [{ name: "Greater Vessel of Light", pick: ["ATT", "DMG%"], stacks: 5 }],
      defaultOn: false,
    },
    {
      id: "divine-blessing",
      name: "Divine Blessing",
      skills: [{ name: "Divine Blessing", pick: ["FD%"] }],
      defaultOn: false,
    },
    {
      id: "divine-shield",
      name: "Divine Shield",
      skills: [{ name: "Divine Shield", pick: ["ATT"] }],
      defaultOn: false,
    },
    {
      id: "parashock-guard",
      name: "Parashock Guard",
      skills: [{ name: "Parashock Guard", pick: ["ATT"] }],
      defaultOn: false,
    },
    {
      id: "weapon-aura",
      name: "Weapon Aura",
      skills: [{ name: "Weapon Aura", pick: ["IED%", "FD%"] }],
      defaultOn: false,
    },
    {
      id: "divine-echo",
      name: "Divine Echo",
      skills: [{ name: "Divine Echo", pick: ["FD%"] }],
      defaultOn: false,
    },
  ],
};
