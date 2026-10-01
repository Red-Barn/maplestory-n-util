import { describe, expect, test } from "vitest";
import { apiHyperInput } from "@/lib/stats";
import { brownBarn, orangeBarn, redBarn } from "@/lib/stats/__tests__/fixtures";
import { apiSpentPoints, cumulativeCost, inputFromLevels, levelsFromInput, spentPoints } from "../cost";

describe("hyper stat point cost", () => {
  test("points spent on one stat by level", () => {
    expect([0, 1, 2, 5, 10, 11, 15].map(cumulativeCost)).toEqual([0, 1, 3, 25, 150, 200, 550]);
    // out of range levels are clamped
    expect(cumulativeCost(-1)).toBe(0);
    expect(cumulativeCost(99)).toBe(550);
  });

  test("points of a whole preset", () => {
    expect(spentPoints({})).toBe(0);
    expect(spentPoints({ dex: 3, damage: 7, criticalRate: 0 })).toBe(7 + 60);
  });

  test("API presets of the fixtures, including stats that don't change damage", () => {
    expect(apiSpentPoints(brownBarn.character)).toBe(583);
    expect(apiSpentPoints(orangeBarn.character)).toBe(582);
    // EXP Lv.15 (550) + normal monster damage Lv.10 (150) + 110 on the rest
    expect(apiSpentPoints(redBarn.character)).toBe(810);
  });

  test("levels ↔ the stat panel's preset input", () => {
    const input = apiHyperInput(redBarn.character);
    const levels = levelsFromInput(input);
    expect(levels).toMatchObject({ dex: 3, str: 1, damage: 7, bossMonsterDamage: 0, criticalRate: 1 });
    expect(inputFromLevels(levels)).toEqual(input);
  });
});
