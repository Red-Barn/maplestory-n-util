import { leveledChoice, type ChoiceDef } from "@/lib/stats/collectors/choices";
import type { PresetEffect } from "@/lib/stats/collectors/presets";

// Link skills that raise stat-window stats. The API stat snapshot includes them, but the
// API doesn't list them, so the level is picked on the character page (Lv.0 = not owned).
// Values per level confirmed in-game by the user; the default level is the user's current one.

const one = (key: PresetEffect["key"], values: number[]): PresetEffect[][] => values.map((value) => [{ key, value }]);

export const LINK_SKILLS: ChoiceDef[] = [
  leveledChoice("bowman", "모험가 궁수", one("CRIT%", [3, 4, 6, 7, 9, 10]), 6),
  leveledChoice("phantom", "팬텀", one("CRIT%", [10, 15]), 2),
  leveledChoice("luminous", "루미너스", one("IED%", [10, 15]), 2),
  leveledChoice("hoyoung", "호영", one("IED%", [5, 10]), 2),
  leveledChoice("cygnus", "시그너스 직업군", one("ATT_MATT", [7, 9, 11, 13, 15, 17, 19, 21, 23, 25]), 10),
  leveledChoice("pirate", "모험가 해적", one("ALL", [20, 30, 40, 50, 60, 70]), 6),
  leveledChoice(
    "adele",
    "아델",
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
    2,
  ),
];
