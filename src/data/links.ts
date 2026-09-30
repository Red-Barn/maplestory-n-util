import { leveledOptions, type ChoiceDef } from "@/lib/stats/collectors/choices";
import type { PresetEffect } from "@/lib/stats/collectors/presets";

// Link skills that raise stat-window stats. The API stat snapshot includes them, but the
// API doesn't list them, so the level is picked on the character page. Values per level
// confirmed in-game by the user; defaultOption is the user's current level.

const one = (key: PresetEffect["key"], values: number[]): PresetEffect[][] => values.map((value) => [{ key, value }]);
const lv = (level: number) => `Lv.${level}`;

export const LINK_SKILLS: ChoiceDef[] = [
  { id: "bowman", name: "모험가 궁수", options: leveledOptions(one("CRIT%", [3, 4, 6, 7, 9, 10]), lv), defaultOption: "6" },
  { id: "phantom", name: "팬텀", options: leveledOptions(one("CRIT%", [10, 15]), lv), defaultOption: "2" },
  { id: "luminous", name: "루미너스", options: leveledOptions(one("IED%", [10, 15]), lv), defaultOption: "2" },
  { id: "hoyoung", name: "호영", options: leveledOptions(one("IED%", [5, 10]), lv), defaultOption: "2" },
  {
    id: "cygnus",
    name: "시그너스 직업군",
    options: leveledOptions(one("ATT_MATT", [7, 9, 11, 13, 15, 17, 19, 21, 23, 25]), lv),
    defaultOption: "10",
  },
  { id: "pirate", name: "모험가 해적", options: leveledOptions(one("ALL", [20, 30, 40, 50, 60, 70]), lv), defaultOption: "6" },
  {
    id: "adele",
    name: "아델",
    options: leveledOptions(
      [
        [
          { key: "BOSS%", value: 2 },
          { key: "DMG%", value: 1 },
        ],
        [
          { key: "BOSS%", value: 4 },
          { key: "DMG%", value: 2 },
        ],
      ],
      lv,
    ),
    defaultOption: "2",
  },
];
