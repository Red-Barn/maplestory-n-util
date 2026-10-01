import { describe, expect, test } from "vitest";
import { parseProbabilityQuery, toPotentialProbability, type RawProbability } from "@/lib/potentialProbability";
import converted from "@/lib/calc/potential/__tests__/fixtures/weapon-red-legendary.json";
import raw from "./fixtures/probability-weapon-red-legendary.raw.json";

const params = (q: Record<string, string>) => new URLSearchParams(q);
const WEAPON = { cube: "RED", grade: "LEGENDARY", part: "WEAPON", level: "150" };

describe("probability query", () => {
  test("valid query, level capped at 120", () => {
    expect(parseProbabilityQuery(params(WEAPON))).toEqual({
      query: { cube: "RED", grade: "LEGENDARY", part: "WEAPON", level: 120 },
    });
    expect(parseProbabilityQuery(params({ ...WEAPON, level: "75" }))).toMatchObject({ query: { level: 75 } });
  });

  test.each([
    { cube: "PURPLE" },
    { grade: "MYTHIC" },
    { part: "POCKET" },
    { level: "0" },
    { level: "201" },
    { level: "1.5" },
    { level: "" },
  ])("rejects %o", (bad) => {
    expect(parseProbabilityQuery(params({ ...WEAPON, ...bad }))).toHaveProperty("error");
  });
});

describe("raw response → per-line tables", () => {
  const query = { cube: "RED", grade: "LEGENDARY", part: "WEAPON", level: 120 };

  test("real msu.io response matches the converted fixture the calculator tests use", () => {
    expect(toPotentialProbability(raw as RawProbability, query)).toEqual(converted);
  });

  test("string chances → numbers, sorted by displayOrder", () => {
    const got = toPotentialProbability(
      {
        cubeType: "CubeType_RED",
        gradeType: "GradeType_LEGENDARY",
        partsType: "PartsType_WEAPON",
        probabilityInfos: [
          {
            probabilityInfo: [
              { optionDescription: "B", probability: "40.5", displayOrder: 2 },
              { optionDescription: "A", probability: "59.500000", displayOrder: 1 },
            ],
          },
        ],
      },
      query,
    );
    expect(got.levelRange).toBeNull();
    expect(got.lines).toEqual([
      [
        { option: "A", probability: 59.5 },
        { option: "B", probability: 40.5 },
      ],
    ]);
  });

  test("no table → no lines", () => {
    const empty = { cubeType: "CubeType_OCCULT", gradeType: "GradeType_LEGENDARY", partsType: "PartsType_WEAPON", probabilityInfos: [] };
    expect(toPotentialProbability(empty, { ...query, cube: "OCCULT" }).lines).toEqual([]);
  });
});
