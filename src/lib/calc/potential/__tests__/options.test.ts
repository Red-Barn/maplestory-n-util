import { describe, expect, it } from "vitest";
import { effectsIn, lineEffect, matchOptions, partOfCategory, type LineOption } from "../options";
import gloves from "./fixtures/gloves-red-legendary.json";
import hat from "./fixtures/hat-black-legendary.json";
import weapon from "./fixtures/weapon-red-legendary.json";

// Fixtures: responses of the msu.io probability search (level 120), in the /api/potential/probability shape.
const WEAPON: LineOption[][] = weapon.lines;
const GLOVES: LineOption[][] = gloves.lines;
const HAT: LineOption[][] = hat.lines;

/** listed chance (fraction) of an option on line i (0-based) */
const chance = (lines: LineOption[][], i: number, option: string) =>
  lines[i].find((o) => o.option === option)!.probability / 100;

describe("tables", () => {
  it("adds up to 100% per line", () => {
    for (const lines of [WEAPON, GLOVES, HAT]) {
      expect(lines).toHaveLength(3);
      for (const line of lines) expect(line.reduce((s, o) => s + o.probability, 0)).toBeCloseTo(100, 3);
    }
  });

  it("reads the effect of each option line", () => {
    expect(lineEffect("Boss Damage: +40%")).toEqual({ effect: "BOSS%", value: 40 });
    expect(lineEffect("Damage: +12%")).toEqual({ effect: "DMG%", value: 12 });
    expect(lineEffect("DEF Ignored: +35%")).toEqual({ effect: "IED%", value: 35 });
    expect(lineEffect("STR : +12%")).toEqual({ effect: "STR%", value: 12 });
    expect(lineEffect("M. ATT per 10 Character Levels: +1")).toEqual({ effect: "MATT/10Lv", value: 1 });
    expect(lineEffect('"Skill Cooldown: -2 sec. (-10% for under 10 sec., minimum cooldown of 5 sec.)"')).toEqual({
      effect: "COOLDOWN",
      value: 2,
    });
    expect(lineEffect("Enables the <Decent Sharp Eyes> skill")).toBeNull();
  });

  it("lists the effects a table can roll, with their values", () => {
    const effects = effectsIn(WEAPON);
    expect(effects.find((e) => e.effect === "ATT%")?.values).toEqual([9, 12]);
    expect(effects.find((e) => e.effect === "BOSS%")?.values).toEqual([30, 35, 40]);
    // every line of the weapon table is modelled
    for (const line of WEAPON) for (const o of line) expect(lineEffect(o.option)).not.toBeNull();
  });
});

describe("user examples (Red Cube, Legendary weapon)", () => {
  const ATT12 = "ATT: +12%";
  const ATT9 = "ATT: +9%";
  const BOSS40 = "Boss Damage: +40%";
  const IED40 = "DEF Ignored: +40%";

  it("ATT 12 / boss 40 / IED 40 → 6 combinations", () => {
    const match = matchOptions(WEAPON, [
      [
        { effect: "ATT%", min: 12 },
        { effect: "BOSS%", min: 40 },
        { effect: "IED%", min: 40 },
      ],
    ]);
    expect(match.cases).toHaveLength(6);
    // every arrangement of the three options over the three lines
    const perms = [
      [ATT12, BOSS40, IED40],
      [ATT12, IED40, BOSS40],
      [BOSS40, ATT12, IED40],
      [BOSS40, IED40, ATT12],
      [IED40, ATT12, BOSS40],
      [IED40, BOSS40, ATT12],
    ];
    const expected = perms.reduce((s, o) => s + o.reduce((p, opt, i) => p * chance(WEAPON, i, opt), 1), 0);
    expect(match.p).toBeCloseTo(expected, 15);
    expect(match.setChances[0]).toBeCloseTo(expected, 15);
  });

  it("ATT 9 / boss 40 / IED 40 → 10 combinations (line 1 only rolls ATT 12)", () => {
    const match = matchOptions(WEAPON, [
      [
        { effect: "ATT%", min: 9 },
        { effect: "BOSS%", min: 40 },
        { effect: "IED%", min: 40 },
      ],
    ]);
    expect(match.cases).toHaveLength(10);
    expect(match.cases.some((c) => c.options[0] === ATT9)).toBe(false);
    expect(match.cases.filter((c) => c.options.includes(ATT9))).toHaveLength(4);
  });

  it("DEX 27 counts All Stats lines and takes every combination reaching 27", () => {
    const match = matchOptions(WEAPON, [[{ effect: "DEX%", min: 27 }]]);
    const dex = (o: string) => {
      const e = lineEffect(o);
      return e && (e.effect === "DEX%" || e.effect === "ALL%") ? e.value : 0;
    };
    let expected = 0;
    let count = 0;
    for (const a of WEAPON[0])
      for (const b of WEAPON[1])
        for (const c of WEAPON[2])
          if (dex(a.option) + dex(b.option) + dex(c.option) >= 27) {
            expected += (a.probability / 100) * (b.probability / 100) * (c.probability / 100);
            count++;
          }
    expect(match.cases).toHaveLength(count);
    expect(match.p).toBeCloseTo(expected, 15);
    // All Stats lines count toward DEX: e.g. DEX 12 + All Stats 9 + DEX 9 = 30
    expect(match.cases.some((c) => c.options.some((o) => o.startsWith("All Stats")))).toBe(true);
    expect(match.cases.some((c) => c.options.every((o) => o.startsWith("DEX")))).toBe(true);
  });
});

describe("option sets", () => {
  const SET1 = [
    { effect: "ATT%" as const, min: 9 },
    { effect: "BOSS%" as const, min: 40 },
    { effect: "IED%" as const, min: 40 },
  ];
  const SET2 = [{ effect: "ATT%" as const, min: 21 }];

  it("succeeds when any set is met, without counting a combination twice", () => {
    const one = matchOptions(WEAPON, [SET1]);
    const two = matchOptions(WEAPON, [SET2]);
    const both = matchOptions(WEAPON, [SET1, SET2]);
    const overlap = both.cases.filter((c) => c.sets.length === 2).reduce((s, c) => s + c.p, 0);
    expect(both.p).toBeCloseTo(one.p + two.p - overlap, 15);
    expect(both.setChances[0]).toBeCloseTo(one.p, 15);
    expect(both.setChances[1]).toBeCloseTo(two.p, 15);
    expect(both.cases.length).toBe(new Set(both.cases.map((c) => c.options.join("|"))).size);
  });

  it("adds up the same effect picked twice", () => {
    const twice = matchOptions(WEAPON, [
      [
        { effect: "BOSS%", min: 40 },
        { effect: "BOSS%", min: 40 },
      ],
    ]);
    const total = matchOptions(WEAPON, [[{ effect: "BOSS%", min: 80 }]]);
    expect(twice.p).toBeCloseTo(total.p, 15);
    expect(twice.cases.every((c) => c.options.filter((o) => o.startsWith("Boss Damage")).length >= 2)).toBe(true);
  });

  it("ignores empty sets and tables without data", () => {
    expect(matchOptions(WEAPON, [[]]).p).toBe(0);
    expect(matchOptions([], [SET2])).toEqual({ p: 0, cases: [], setChances: [0] });
    const withEmpty = matchOptions(WEAPON, [[], SET2]);
    expect(withEmpty.setChances[0]).toBe(0);
    expect(withEmpty.setChances[1]).toBeCloseTo(withEmpty.p, 15);
  });
});

describe("limit rules", () => {
  // all combinations, by enumerating with no condition that can fail
  const everything = (lines: LineOption[][]) =>
    matchOptions(lines, [[{ effect: "HP%", min: 0 }]]);

  // listed chances are rounded to 6 decimals, so the total is only 100% to about 1e-7
  it("still adds up to 100% over all combinations", () => {
    for (const lines of [GLOVES, HAT]) expect(everything(lines).p).toBeCloseTo(1, 6);
  });

  it("keeps Decent skills to one line and rescales the next lines", () => {
    const all = everything(GLOVES);
    const decentCount = (c: { options: string[] }) => c.options.filter((o) => /<Decent /.test(o)).length;
    expect(Math.max(...all.cases.map(decentCount))).toBe(1);

    // line 1 Decent Speed Infusion → line 2 can't be Decent, the rest is scaled up
    const first = "Enables the <Decent Speed Infusion> skill";
    const second = "STR : +12%";
    const excluded = GLOVES[1].filter((o) => /<Decent /.test(o.option)).reduce((s, o) => s + o.probability, 0);
    const third = "LUK : +9%";
    const excluded3 = GLOVES[2].filter((o) => /<Decent /.test(o.option)).reduce((s, o) => s + o.probability, 0);
    const found = all.cases.find((c) => c.options.join("|") === [first, second, third].join("|"))!;
    expect(found.rescaled).toBe(true);
    expect(found.p).toBeCloseTo(
      chance(GLOVES, 0, first) *
        (GLOVES[1].find((o) => o.option === second)!.probability / (100 - excluded)) *
        (GLOVES[2].find((o) => o.option === third)!.probability / (100 - excluded3)),
      15,
    );
  });

  it("keeps the damage-ignore options to two lines", () => {
    const all = everything(HAT);
    const ignores = (c: { options: string[] }) => c.options.filter((o) => /chance to ignore/.test(o)).length;
    expect(Math.max(...all.cases.map(ignores))).toBe(2);
  });
});

describe("partOfCategory", () => {
  it("maps item categories to probability search parts", () => {
    expect(partOfCategory("Two-handed Weapon", "Bow")).toBe("WEAPON");
    expect(partOfCategory("Secondary Weapon", "Arrow Fletching")).toBe("WEAPON_SECONDARY");
    expect(partOfCategory("Armor", "Hat")).toBe("HAT");
    expect(partOfCategory("Accessory", "Earrings")).toBe("ACCESSORY_EAR");
    expect(partOfCategory("Accessory", "Pocket Item")).toBeUndefined();
  });
});
