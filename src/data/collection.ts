import { leveledOptions, type ChoiceDef } from "@/lib/stats/collectors/choices";

// Collection (도감) tiers. The API stat snapshot includes them. Values confirmed in-game by the user.
// [all stats, ATT/MATT, damage & boss damage & crit damage %, IED & crit rate %]
const TIERS: [number, number, number, number][] = [
  [40, 4, 2, 2],
  [80, 8, 4, 6],
  [120, 12, 6, 8],
  [160, 16, 8, 12],
  [200, 20, 10, 14],
  [240, 24, 12, 18],
  [280, 28, 14, 20],
  [320, 32, 16, 24],
  [360, 36, 18, 26],
  [400, 40, 20, 30],
  [440, 44, 22, 32],
  [500, 50, 25, 38],
];

// Flat all stats are treated like equipment flat stats (multiplied by stat %).
export const COLLECTION: ChoiceDef[] = [
  {
    id: "collection",
    name: "도감",
    options: leveledOptions(
      TIERS.map(([all, att, dmg, ied]) => [
        { key: "ALL", value: all },
        { key: "ATT_MATT", value: att },
        { key: "DMG%", value: dmg },
        { key: "BOSS%", value: dmg },
        { key: "CDMG%", value: dmg },
        { key: "IED%", value: ied },
        { key: "CRIT%", value: ied },
      ]),
      (level) => `${level}단계`,
    ),
    defaultOption: "",
  },
];
