import { describe, expect, test } from "vitest";
import { findJob } from "@/data/jobs";
import { LINK_SKILLS } from "@/data/links";
import { MISC_ITEMS, TITLES } from "@/data/miscItems";
import { apStatToFinal, choicesForJob, collectCharacter, computeStats, effectsForJob, isRelevant, presetsForJob } from "..";
import type { JobView } from "..";
import type { CharacterBundle } from "@/types/msu";
import { brownBarn, orangeBarn, redBarn } from "./fixtures";

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
] as const)("%s main/sub stat and attack type", (_, bundle, jobName, main, sub) => {
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
    expect(c.ap[main]).toBe(5 * level + 18);
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

  test("one pet, no pet equipment", () => {
    const pets = c.permanent.filter((x) => x.source === "pet" && x.stat === "ATT");
    expect(pets.map((x) => `${x.label}=${x.value}`)).toEqual(["펫 1마리=3"]);
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

  test("passives", () => {
    expect(of("Fox God's Favor")).toEqual(["ATT=20", "DMG%=10"]);
    expect(of("Loaded Dice")).toEqual(["ATT=19"]);
    expect(of("Weaken")).toEqual(["IED%=20"]); // not the conditional +20% damage
    expect(of("Spirit Bond 4")).toEqual(["IED%=30", "BOSS%=30"]);
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
