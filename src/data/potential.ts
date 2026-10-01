import type { CubeId } from "@/data/itemIds";

// Potential tier-up rates per cube use. Source: given by the user in issue #34 (as is).
//
// - The table's "Bonus White Cube" is the API's "White Cube" (5062503) — confirmed by the user.
// - Bonus Occult Cube (2730000) is left out: its tier-up rates aren't known yet. Add a row here
//   once they are.

/** Potential grades, numbered as the API does (`PotentialOption.grade`); 0 = no grade. */
export const GRADES = [
  { grade: 1, name: "Rare", label: "레어" },
  { grade: 2, name: "Epic", label: "에픽" },
  { grade: 3, name: "Unique", label: "유니크" },
  { grade: 4, name: "Legendary", label: "레전드리" },
] as const;

export const MIN_GRADE = 1;
export const MAX_GRADE = 4;

export type PotentialKind = "potential" | "bonus";

export const POTENTIAL_KINDS: { kind: PotentialKind; label: string }[] = [
  { kind: "potential", label: "잠재능력" },
  { kind: "bonus", label: "에디셔널 잠재능력" },
];

export type TierUpCube = {
  id: CubeId;
  name: string;
  kind: PotentialKind;
  /** Chance (%) of Rare→Epic, Epic→Unique, Unique→Legendary per cube; null = the cube can't do that step. */
  rates: [number | null, number | null, number | null];
};

const BONUS_RATES: TierUpCube["rates"] = [4.7619, 1.9608, 0.4975];

export const TIER_UP_CUBES: TierUpCube[] = [
  { id: 2711000, name: "Occult Cube", kind: "potential", rates: [0.9901, null, null] },
  { id: 5062009, name: "Red Cube", kind: "potential", rates: [6, 1.8, 0.3] },
  { id: 5062010, name: "Black Cube", kind: "potential", rates: [15, 3.5, 1] },
  { id: 5062500, name: "Bonus Potential Cube", kind: "bonus", rates: BONUS_RATES },
  { id: 5062503, name: "White Cube", kind: "bonus", rates: BONUS_RATES },
];

// ---------------------------------------------------------------------------------------------
// Option rolls. Per-line option chances come from the probability search on msu.io
// (/maplestoryn/gamestatus/probabilityitems → GET /api/potential/probability, issue #42).
// The Bonus Occult Cube page has no tier-up table and only a Rare column, so it can't raise grades.

/** Grade → `gradeType` of the probability search. */
export const GRADE_TYPES: Record<number, string> = { 1: "RARE", 2: "EPIC", 3: "UNIQUE", 4: "LEGENDARY" };

export type OptionCube = {
  /** item ID, for the price */
  id: CubeId;
  name: string;
  kind: PotentialKind;
  /** `cubeType` of the probability search */
  cubeType: "OCCULT" | "RED" | "BLACK" | "BONUS_OCCULT" | "BONUS_POTENTIAL";
};

export const OPTION_CUBES: OptionCube[] = [
  { id: 2711000, name: "Occult Cube", kind: "potential", cubeType: "OCCULT" },
  { id: 5062009, name: "Red Cube", kind: "potential", cubeType: "RED" },
  { id: 5062010, name: "Black Cube", kind: "potential", cubeType: "BLACK" },
  { id: 2730000, name: "Bonus Occult Cube", kind: "bonus", cubeType: "BONUS_OCCULT" },
  // the site lists these two as one: "Bonus Potential Cube / Bonus White Cube"
  { id: 5062500, name: "Bonus Potential Cube", kind: "bonus", cubeType: "BONUS_POTENTIAL" },
  { id: 5062503, name: "White Cube", kind: "bonus", cubeType: "BONUS_POTENTIAL" },
];

/** `partsType` values the probability search takes, with the item category (tier3 label) they cover. */
export const PARTS = [
  { part: "WEAPON", label: "무기" },
  { part: "WEAPON_SECONDARY", label: "보조무기" },
  { part: "EMBLEM", label: "엠블렘", tier3: "Emblem" },
  { part: "HAT", label: "모자", tier3: "Hat" },
  { part: "TOP", label: "상의", tier3: "Top" },
  { part: "OVERALL", label: "한벌옷", tier3: "Overall" },
  { part: "BOTTOM", label: "하의", tier3: "Bottom" },
  { part: "SHOES", label: "신발", tier3: "Shoes" },
  { part: "GLOVES", label: "장갑", tier3: "Gloves" },
  { part: "CAPE", label: "망토", tier3: "Cape" },
  { part: "BELT", label: "벨트", tier3: "Belt" },
  { part: "ACCESSORY_SHOULDER", label: "어깨장식", tier3: "Shoulder Accessory" },
  { part: "ACCESSORY_FACE", label: "얼굴장식", tier3: "Face Accessory" },
  { part: "ACCESSORY_EYE", label: "눈장식", tier3: "Eye Accessory" },
  { part: "ACCESSORY_EAR", label: "귀고리", tier3: "Earrings" },
  { part: "ACCESSORY_RING", label: "반지", tier3: "Ring" },
  { part: "ACCESSORY_PENDANT", label: "펜던트", tier3: "Pendant" },
] as const;

export type Part = (typeof PARTS)[number]["part"];

/** The site sends at most this equipment level; every level above uses the same table. */
export const MAX_PROBABILITY_LEVEL = 120;

/**
 * Options limited to a number of the 3 lines (text on the msu.io probability page). Once a line
 * reaches the limit, the next lines are rolled from the other options: each chance becomes
 * listed chance / (100% − sum of the excluded options' listed chances).
 * The two invincibility rules weren't seen in any probability table yet, so their patterns are a guess
 * from the page's wording.
 */
export const OPTION_LIMITS: { name: string; pattern: RegExp; max: number }[] = [
  { name: "Decent Skills Category", pattern: /<decent /i, max: 1 },
  { name: "Increases invincibility duration when being hit", pattern: /invincibility (?:duration|time)/i, max: 1 },
  { name: "Ignores Damage % with certain rate when being hit", pattern: /chance to ignore \d+% damage/i, max: 2 },
  { name: "Becomes invincible for a set time with certain rate when being hit", pattern: /become(?:s)? invincible/i, max: 2 },
];

export const MAX_OPTION_SETS = 15;
export const MAX_SET_CONDITIONS = 3;
