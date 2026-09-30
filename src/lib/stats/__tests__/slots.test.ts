import { describe, expect, test } from "vitest";
import { findJob } from "@/data/jobs";
import { HYPER_STATS } from "@/data/hyperStats";
import {
  abilityTypesForJob,
  apiAbilityLines,
  apiHyperInput,
  collectAbilityLines,
  collectCharacter,
  collectChoices,
  collectPets,
  petAtt,
  sumStats,
} from "..";
import { collectAbility } from "../collectors/character";
import { brownBarn, orangeBarn, redBarn } from "./fixtures";

const statsOf = (list: { stat: string; value: number }[]) => list.map((x) => `${x.stat}=${x.value}`);

describe("hyper stat presets", () => {
  // The level table must reproduce what the API says each level gives.
  test.each([
    ["RedBarn", redBarn],
    ["BrownBarn", brownBarn],
    ["OrangeBarn", orangeBarn],
  ])("%s: a preset copied from the API levels gives the API's stats", (_, bundle) => {
    const api = sumStats(collectCharacter(bundle).hyper);
    const copy = sumStats(collectChoices(HYPER_STATS, apiHyperInput(bundle.character), "hyper"));
    for (const stat of Object.keys(copy) as (keyof typeof copy)[]) expect([stat, copy[stat]]).toEqual([stat, api[stat]]);
    // nothing the stat table shows is missing from the table
    for (const stat of ["ATT", "DMG%", "BOSS%", "CDMG%", "CRIT%"] as const) expect(copy[stat] ?? 0).toBe(api[stat] ?? 0);
  });

  test("levels", () => {
    const at = (id: string, level: number) => statsOf(collectChoices(HYPER_STATS, { [id]: String(level) }, "hyper"));
    expect(at("dex", 4)).toEqual(["DEX_FIXED=120"]); // not multiplied by stat %
    expect(at("attackAndMagicAttack", 7)).toEqual(["ATT=21", "MATT=21"]);
    expect(at("bossMonsterDamage", 13)).toEqual(["BOSS%=47"]); // 3% to Lv.5, then 4% (live RedBarn)
    expect(at("criticalRate", 4)).toEqual(["CRIT%=4"]);
    expect(at("damage", 0)).toEqual([]);
  });
});

describe("ability presets", () => {
  test("lines read from the API", () => {
    expect(apiAbilityLines(redBarn.character)).toEqual([
      { type: "" }, // damage to normal monsters: not in the stat table
      { type: "" }, // Max MP
      { type: "DEX+INT", value: 26 },
    ]);
    expect(apiAbilityLines(brownBarn.character)).toEqual([
      { type: "BOSS%", value: 19 },
      { type: "ALL", value: 7 },
      { type: "" }, // conditional damage
    ]);
    expect(apiAbilityLines(orangeBarn.character)[2]).toEqual({ type: "ATT", value: 9 });
  });

  test.each([
    ["BrownBarn", brownBarn],
    ["OrangeBarn", orangeBarn],
  ])("%s: a preset copied from the API lines gives the API's stats", (_, bundle) => {
    const copy = collectAbilityLines(apiAbilityLines(bundle.character), "x");
    expect(sumStats(copy)).toEqual(sumStats(collectAbility(bundle.character)));
  });

  test("entered lines", () => {
    const lines = [{ type: "ATT", value: 6 }, { type: "DEX+INT", value: 27 }, { type: "", value: 5 }];
    expect(statsOf(collectAbilityLines(lines, "x"))).toEqual(["ATT=6", "DEX=27", "INT=13"]);
    expect(collectAbilityLines([{ type: "BOSS%" }], "x")).toEqual([]); // no value yet
  });

  test("kinds offered to a job", () => {
    const ids = abilityTypesForJob(findJob(313)).map((t) => t.id); // Bowmaster: DEX / STR / ATT
    expect(ids).toEqual(expect.arrayContaining(["DEX", "STR", "ALL", "ATT", "BOSS%", "CRIT%", "DEX+STR", "DEX+INT", "LUK+DEX"]));
    for (const id of ["INT", "LUK", "MATT", "INT+LUK", "LUK+INT"]) expect(ids).not.toContain(id);
    // a kind already chosen stays selectable
    expect(abilityTypesForJob(findJob(313), ["INT"]).map((t) => t.id)).toContain("INT");
    expect(abilityTypesForJob(undefined)).toHaveLength(21);
  });
});

describe("pets are set by the user, each with its equipment", () => {
  test("ATT & Magic ATT per number of pets", () => {
    expect([0, 1, 2, 3].map(petAtt)).toEqual([0, 8, 24, 45]);
    expect(collectPets(0)).toEqual([]);
    expect(collectPets(2).filter((x) => x.stat === "ATT").map((x) => `${x.label}=${x.value}`)).toEqual([
      "펫 2마리=14",
      "펫장비 2개=10",
    ]);
    expect(collectPets(9)).toEqual(collectPets(3));
  });

  test("the API's pet count is only the starting value", () => {
    expect([redBarn, brownBarn, orangeBarn].map((b) => collectCharacter(b).petCount)).toEqual([3, 1, 1]);
  });
});
