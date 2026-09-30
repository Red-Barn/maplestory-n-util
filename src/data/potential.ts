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
