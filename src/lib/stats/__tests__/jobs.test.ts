import { describe, expect, test } from "vitest";
import { findJob } from "@/data/jobs";
import { LINK_SKILLS } from "@/data/links";
import { MISC_ITEMS, TITLES } from "@/data/miscItems";
import {
  apStatToFinal,
  choicesForJob,
  collectBlessing,
  collectCharacter,
  computeStats,
  effectsForJob,
  isRelevant,
  presetsForJob,
} from "..";
import type { JobView } from "..";
import type { CharacterBundle } from "@/types/msu";
import { brownBarn, orangeBarn, redBarn, unjna } from "./fixtures";

const setup = (bundle: CharacterBundle) => {
  const c = collectCharacter(bundle);
  const base = [...c.permanent, ...c.buffs.filter((b) => b.defaultOn).flatMap((b) => b.contributions)];
  const of = (name: string) => c.permanent.filter((x) => x.label.startsWith(name)).map((x) => `${x.stat}=${x.value}`);
  return { c, of, api: apStatToFinal(bundle.character.apStat), result: computeStats(base, c.ap) };
};

// The job's main stat, sub stat and attack type must be the largest ones in the in-game stat window.
describe.each([
  ["RedBarn", redBarn, "Bowmaster", "DEX", "STR"],
  ["BrownBarn", brownBarn, "Aran", "STR", "DEX"],
  ["OrangeBarn", orangeBarn, "Shade", "STR", "DEX"],
  ["unjna", unjna, "Paladin", "STR", "DEX"],
] as const)("%s main/sub stat and attack type", (name, bundle, jobName, main, sub) => {
  const { c, api } = setup(bundle);

  test("job data matches the API job", () => {
    expect(bundle.character.common.job.jobName).toBe(jobName);
    expect(c.job?.name).toBe(jobName);
    expect([c.job?.mainStat, c.job?.subStats, c.job?.attackType]).toEqual([main, [sub], "ATT"]);
  });

  test("in-game stats agree: main > sub > the rest, ATT > Magic ATT", () => {
    const ranked = [...(["STR", "DEX", "INT", "LUK"] as const)].sort((a, b) => api[b] - api[a]);
    expect(ranked.slice(0, 2)).toEqual([main, sub]);
    expect(api.ATT).toBeGreaterThan(api.MATT);
  });

  test("main stat gets the AP", () => {
    const level = bundle.character.common.level;
    expect(c.ap[main]).toBe(5 * level + (name === "BrownBarn" ? 23 : 18)); // Aran: 5n + 23
    if (name === "BrownBarn") expect(c.ap.STR).toBe(1148);
    expect(c.ap[sub]).toBe(4);
  });
});

describe("BrownBarn (Aran Lv.225)", () => {
  const { c, of, api, result } = setup(brownBarn);

  test("final damage matches in-game exactly", () => {
    expect(result.final["FD%"]).toBe(api["FD%"]); // Polearm Mastery 10% × High Mastery 15%
  });

  test("buffs: season buff on, skill buffs off", () => {
    expect(c.buffs.map((b) => b.id)).toEqual(["season-tonic", "echo-of-hero", "maple-warrior", "maha-blessing", "weapon-aura"]);
    expect(c.buffs.filter((b) => b.defaultOn).map((b) => b.id)).toEqual(["season-tonic"]);
  });

  test("skills with an active part only count their passive effect", () => {
    expect(of("Snow Charge")).toEqual(["DMG%=10"]); // not the +10% on slowed enemies as well
    expect(of("Combo Ability")).toEqual(["CRIT%=20"]);
    expect(of("Drain")).toEqual(["HP%=10"]);
    expect(of("Decent Sharp Eyes").sort()).toEqual(["DEX=1", "INT=1", "LUK=1", "STR=1"]);
  });

  test("Advanced Combo Ability keeps combo ATT at the max", () => {
    expect(of("Advanced Combo Ability")).toEqual(["ATT=10", "CDMG%=10", "ATT=20"]);
  });

  test("buff texts", () => {
    const buff = (id: string) => c.buffs.find((b) => b.id === id)!.contributions.map((x) => `${x.stat}=${x.value}`);
    expect(buff("maha-blessing")).toEqual(["ATT=30", "MATT=30"]);
    expect(buff("weapon-aura")).toEqual(["IED%=12", "FD%=2"]);
  });

  test("one pet counts with its equipment as a set", () => {
    const pets = c.permanent.filter((x) => x.source === "pet" && x.stat === "ATT");
    expect(pets.map((x) => `${x.label}=${x.value}`)).toEqual(["펫 1마리=3", "펫장비 1개=5"]);
  });
});

describe("unjna (Paladin Lv.241)", () => {
  const { c, of, api, result } = setup(unjna);
  const buff = (id: string) => c.buffs.find((b) => b.id === id)!.contributions.map((x) => `${x.stat}=${x.value}`);

  test("final damage matches in-game exactly", () => {
    expect(result.final["FD%"]).toBe(api["FD%"]); // High Paladin 40%
  });

  test("High Paladin: only the line for the equipped weapon type (Two-Handed Blunt) counts", () => {
    expect(unjna.items.weapon?.category.tier3.label).toBe("Two-Handed Blunt");
    expect(of("High Paladin")).toEqual(["CRIT%=40", "CDMG%=20", "IED%=30", "FD%=40", "CDMG%=5", "IED%=10"]);
  });

  test("Shield Mastery needs a shield or rosary", () => {
    expect(unjna.items.subWeapon?.category.tier3.label).toBe("Rosary");
    expect(of("Shield Mastery")).toEqual(["ATT=10"]);
    const noRosary = collectCharacter({ ...unjna, items: { ...unjna.items, subWeapon: null } });
    expect(noRosary.permanent.some((x) => x.label.startsWith("Shield Mastery"))).toBe(false);
  });

  test("with another weapon type the weapon line changes", () => {
    const weapon = unjna.items.weapon!;
    const sword = { ...weapon, category: { ...weapon.category, tier3: { code: "", label: "Two-Handed Sword" } } };
    const c2 = collectCharacter({ ...unjna, items: { ...unjna.items, weapon: sword } });
    const got = c2.permanent.filter((x) => x.label.startsWith("High Paladin")).map((x) => `${x.stat}=${x.value}`);
    expect(got).toEqual(["CRIT%=40", "CDMG%=20", "IED%=30", "FD%=40", "CDMG%=5"]);
  });

  test("the API lists Empress's Blessing for Paladin", () => {
    expect(c.apiEmpressBlessing).toBe(true);
    expect(of("Empress's Blessing")).toEqual(["ATT=30", "MATT=30"]);
  });

  test("Decent skill passives add all stats", () => {
    expect(of("Decent Sharp Eyes").sort()).toEqual(["DEX=2", "INT=2", "LUK=2", "STR=2"]);
    expect(of("Decent Speed Infusion").sort()).toEqual(["DEX=2", "INT=2", "LUK=2", "STR=2"]);
  });

  test("buffs are off by default and read from the skill texts", () => {
    expect(c.buffs.map((b) => b.id)).toEqual([
      "season-tonic",
      "echo-of-hero",
      "maple-warrior",
      "light-charge",
      "divine-blessing",
      "divine-shield",
      "parashock-guard",
      "weapon-aura",
      "divine-echo",
    ]);
    expect(c.buffs.filter((b) => b.defaultOn).map((b) => b.id)).toEqual(["season-tonic"]);
    expect(buff("light-charge")).toEqual(["DMG%=25", "ATT=60"]); // 5 charges × (5%, 12)
    expect(buff("divine-blessing")).toEqual(["FD%=20"]);
    expect(buff("divine-shield")).toEqual(["ATT=20"]);
    expect(buff("parashock-guard")).toEqual(["ATT=20"]);
    expect(buff("weapon-aura")).toEqual(["IED%=15", "FD%=5"]);
    expect(buff("divine-echo")).toEqual(["FD%=72"]);
  });
});

describe("OrangeBarn (Shade Lv.225)", () => {
  const { c, of, api, result } = setup(orangeBarn);

  test("final damage matches in-game exactly", () => {
    expect(result.final["FD%"]).toBe(api["FD%"]); // Spirit Bond 3 × Advanced Knuckle Mastery × Critical Insight
  });

  test("buffs", () => {
    expect(c.buffs.map((b) => b.id)).toEqual(["season-tonic", "echo-of-hero", "maple-warrior"]);
  });

  test("ability line \"Attack: +9\" counts as ATT", () => {
    const ability = c.permanent.filter((x) => x.source === "ability").map((x) => `${x.stat}=${x.value}`);
    expect(ability).toEqual(["BOSS%=18", "ATT=9"]); // the abnormal status line is conditional
  });

  test("ability all stats are not multiplied by stat %", () => {
    const b = setup(brownBarn).c.permanent.filter((x) => x.source === "ability").map((x) => `${x.stat}=${x.value}`);
    expect(b).toEqual(["BOSS%=19", "STR_FIXED=7", "DEX_FIXED=7", "INT_FIXED=7", "LUK_FIXED=7"]);
  });

  test("passives", () => {
    expect(of("Fox God's Favor")).toEqual(["ATT=20", "DMG%=10"]);
    expect(of("Loaded Dice")).toEqual(["ATT=19"]);
    expect(of("Weaken")).toEqual(["IED%=20"]); // not the conditional +20% damage
    expect(of("Spirit Bond 4")).toEqual(["IED%=30", "BOSS%=30"]);
  });
});

describe("Blessing of the Fairy / Empress's Blessing: only the stronger applies", () => {
  const att = (list: { stat: string; label: string; value: number }[]) =>
    list.filter((x) => x.stat === "ATT").map((x) => `${x.label}=${x.value}`);

  test("RedBarn: the API lists both, Empress's Blessing wins", () => {
    expect(collectCharacter(redBarn).apiEmpressBlessing).toBe(true);
    expect(att(collectBlessing(redBarn.skills))).toEqual(["Empress's Blessing Lv.30=30"]);
    // an entered level is ignored when the API already has the skill
    expect(att(collectBlessing(redBarn.skills, 5))).toEqual(["Empress's Blessing Lv.30=30"]);
  });

  test.each([
    ["BrownBarn", brownBarn],
    ["OrangeBarn", orangeBarn],
  ])("%s: the API lists only Blessing of the Fairy, the entered Empress's Blessing level is compared", (_, bundle) => {
    expect(collectCharacter(bundle).apiEmpressBlessing).toBe(false);
    expect(att(collectBlessing(bundle.skills))).toEqual(["Blessing of the Fairy Lv.20=20"]);
    expect(att(collectBlessing(bundle.skills, 30))).toEqual(["Empress's Blessing Lv.30=30"]);
    expect(collectBlessing(bundle.skills, 30).map((x) => x.stat)).toEqual(["ATT", "MATT"]); // not added on top
    expect(att(collectBlessing(bundle.skills, 10))).toEqual(["Blessing of the Fairy Lv.20=20"]); // weaker
  });
});

describe("what a job doesn't need is left out of the inputs", () => {
  const bowmaster = findJob(313);
  const aran = findJob(2113);
  const mage: JobView = { mainStat: "INT", subStats: ["LUK"], attackType: "MATT" };

  test("stats", () => {
    expect((["STR", "DEX%", "DEX_FIXED", "ATT", "ATT%"] as const).map((s) => isRelevant(s, aran))).toEqual(Array(5).fill(true));
    expect((["INT", "LUK%", "INT_FIXED", "MATT", "MATT%"] as const).map((s) => isRelevant(s, aran))).toEqual(Array(5).fill(false));
    expect(isRelevant("BOSS%", aran)).toBe(true);
    expect(isRelevant("MATT", undefined)).toBe(true); // unknown job: show everything
  });

  test("ATT & Magic ATT reads as the job's attack type", () => {
    const effects = [{ key: "ATT_MATT", value: 25 }, { key: "ALL", value: 10 }] as const;
    expect(effectsForJob([...effects], aran).map((e) => e.key)).toEqual(["ATT", "ALL"]);
    expect(effectsForJob([...effects], mage).map((e) => e.key)).toEqual(["MATT", "ALL"]);
    expect(effectsForJob([...effects], undefined).map((e) => e.key)).toEqual(["ATT_MATT", "ALL"]);
  });

  test("arrows are only for the Bowmaster", () => {
    expect(presetsForJob(MISC_ITEMS, "Bowmaster", bowmaster).map((d) => d.id)).toEqual(["arrow-titanium-bow"]);
    expect(presetsForJob(MISC_ITEMS, "Aran", aran)).toEqual([]);
    expect(presetsForJob(MISC_ITEMS, "Shade", findJob(2513))).toEqual([]);
    expect(presetsForJob(MISC_ITEMS, "Luminous", undefined)).toEqual([]); // no job data, still not a bow user
  });

  test("link skills and titles all apply to physical and magic jobs", () => {
    expect(choicesForJob(LINK_SKILLS, aran)).toHaveLength(LINK_SKILLS.length);
    expect(choicesForJob(LINK_SKILLS, mage)).toHaveLength(LINK_SKILLS.length);
    expect(choicesForJob(TITLES, mage)).toHaveLength(TITLES.length);
  });
});
