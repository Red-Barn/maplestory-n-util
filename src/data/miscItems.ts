import type { PresetDef } from "@/lib/stats/collectors/presets";

// Items the API doesn't return but the stat snapshot includes (title, arrows).
// Values confirmed in-game by the user.
export const MISC_ITEMS: PresetDef[] = [
  {
    id: "title-holy-pink-beanity",
    name: "Holy Pink Beanity",
    tag: "칭호",
    effects: [
      { key: "ALL", value: 10 },
      { key: "ATT_MATT", value: 5 },
      { key: "BOSS%", value: 10 },
    ],
  },
  {
    id: "arrow-titanium-bow",
    name: "Titanium Arrows for Bow",
    tag: "화살",
    effects: [{ key: "ATT", value: 9 }],
  },
];
