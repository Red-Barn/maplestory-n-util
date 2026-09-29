import type { InputKey } from "@/lib/stats/collectors/inputs";

// Link skills that raise stat-window stats. The API stat snapshot includes them, but the
// API doesn't list them, so they're entered on the character page. Values are at the listed level.
export type LinkEffect = { key: InputKey; value: number };
export type LinkSkillDef = { id: string; name: string; level: number; effects: LinkEffect[] };

export const LINK_SKILLS: LinkSkillDef[] = [
  { id: "bowman", name: "궁수 링크", level: 6, effects: [{ key: "CRIT%", value: 10 }] },
  { id: "phantom", name: "팬텀 링크", level: 2, effects: [{ key: "CRIT%", value: 15 }] },
  { id: "luminous", name: "루미너스 링크", level: 2, effects: [{ key: "IED%", value: 15 }] },
  { id: "cygnus", name: "시그너스 링크", level: 10, effects: [{ key: "ATT_MATT", value: 25 }] },
  { id: "pirate", name: "해적 링크", level: 6, effects: [{ key: "ALL", value: 70 }] },
  {
    id: "adele",
    name: "아델 링크",
    level: 2,
    effects: [
      { key: "BOSS%", value: 4 },
      { key: "DMG%", value: 2 },
    ],
  },
];
