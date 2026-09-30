import type { ChoiceDef } from "@/lib/stats/collectors/choices";
import type { PresetDef } from "@/lib/stats/collectors/presets";

// Items the API doesn't return but the stat snapshot includes. Values confirmed in-game by the user.

/** Titles — only one can be worn. defaultOption is the user's current title. */
export const TITLES: ChoiceDef[] = [
  {
    id: "title",
    name: "칭호",
    options: [
      {
        id: "holy-pink-beanity",
        label: "Holy Pink Beanity",
        effects: [
          { key: "ALL", value: 10 },
          { key: "ATT_MATT", value: 5 },
          { key: "BOSS%", value: 10 },
        ],
      },
      { id: "chaos-vellum-crusher", label: "Chaos Vellum Crusher", effects: [{ key: "BOSS%", value: 5 }] },
    ],
    defaultOption: "holy-pink-beanity",
  },
];

export const MISC_ITEMS: PresetDef[] = [
  {
    id: "arrow-titanium-bow",
    name: "Titanium Arrows for Bow",
    tag: "화살",
    effects: [{ key: "ATT", value: 9 }],
  },
];
