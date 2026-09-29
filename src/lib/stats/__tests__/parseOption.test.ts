import { describe, expect, test } from "vitest";
import { parseOption } from "../parseOption";

describe("parseOption", () => {
  test.each([
    ["DEX : +9%", [{ stat: "DEX%", value: 9 }]],
    ["DEX : +12", [{ stat: "DEX", value: 12 }]],
    ["ATT: +12%", [{ stat: "ATT%", value: 12 }]],
    ["Magic ATT: +10", [{ stat: "MATT", value: 10 }]],
    ["Boss Damage: +40%", [{ stat: "BOSS%", value: 40 }]],
    ["DEF Ignored: +30%", [{ stat: "IED%", value: 30 }]],
    ["Critical Damage: +8%", [{ stat: "CDMG%", value: 8 }]],
    ["Max HP: +5%", [{ stat: "HP%", value: 5 }]],
    ["DEF: +120", []],
    ["3% chance to recover 47 HP when attacking.", []],
  ])("potential %s", (label, expected) => {
    expect(parseOption(label)).toEqual(expected);
  });

  test("all stats % and flat", () => {
    expect(parseOption("All Stats: +6%")).toEqual([{ stat: "ALL%", value: 6 }]);
    expect(parseOption("All Stats: +10").map((e) => e.stat)).toEqual(["STR", "DEX", "INT", "LUK"]);
  });

  test("per-level potential uses character level", () => {
    expect(parseOption("STR per 10 Character Levels: +1", { level: 244 })).toEqual([{ stat: "STR", value: 24 }]);
  });

  test("hyper stat descriptions", () => {
    expect(parseOption("Dexterity +90")).toEqual([{ stat: "DEX", value: 90 }]);
    expect(parseOption("Attack Power and Magic ATT: +12")).toEqual([
      { stat: "ATT", value: 12 },
      { stat: "MATT", value: 12 },
    ]);
    expect(parseOption("Damage Against Normal Monsters +35%")).toEqual([{ stat: "NORMAL%", value: 35 }]);
  });

  test("skill effect texts", () => {
    expect(parseOption("Permanently increase STR by 30 and DEX by 30.")).toEqual([
      { stat: "STR", value: 30 },
      { stat: "DEX", value: 30 },
    ]);
    expect(parseOption("Attack Power: +60, Critical Damage: +16%")).toEqual([
      { stat: "ATT", value: 60 },
      { stat: "CDMG%", value: 16 },
    ]);
    expect(parseOption("MP Cost: 1000. Duration: 40 sec. Attack Power: + 17%.")).toEqual([{ stat: "ATT%", value: 17 }]);
    expect(parseOption("MP Cost: 30, increases Attack Power & Magic ATT by 4% for 2400 sec")).toEqual([
      { stat: "ATT%", value: 4 },
      { stat: "MATT%", value: 4 },
    ]);
    expect(parseOption("+10% damage to normal monsters")).toEqual([{ stat: "NORMAL%", value: 10 }]);
  });

  test("set effect texts", () => {
    expect(parseOption("MaxHP / MaxMP: +10%")).toEqual([
      { stat: "HP%", value: 10 },
      { stat: "MP%", value: 10 },
    ]);
    expect(parseOption("ATT & Magic ATT: +5")).toEqual([
      { stat: "ATT", value: 5 },
      { stat: "MATT", value: 5 },
    ]);
  });
});
