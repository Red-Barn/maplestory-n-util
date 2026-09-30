import type { ChoiceDef } from "@/lib/stats/collectors/choices";
import type { PresetDef } from "@/lib/stats/collectors/presets";

// Items the API doesn't return but the stat snapshot includes. Values confirmed in-game by the user.

const mvp = (id: string, label: string, all: number, att: number): ChoiceDef["options"][number] => ({
  id,
  label,
  effects: [
    { key: "ALL", value: all },
    { key: "ATT_MATT", value: att },
  ],
});

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
      mvp("mvp-gold", "MVP Gold", 8, 7),
      mvp("mvp-silver", "MVP Silver", 7, 5),
      mvp("mvp-bronze", "MVP Bronze", 6, 4),
    ],
    defaultOption: "holy-pink-beanity",
    noneLabel: "없음",
  },
];

export const MISC_ITEMS: PresetDef[] = [
  {
    id: "arrow-titanium-bow",
    name: "Titanium Arrows for Bow",
    tag: "화살",
    effects: [{ key: "ATT", value: 9 }],
    onlyJobs: ["Bowmaster"],
  },
];
