// Per-line potential option chances (GET /api/potential/probability). Safe to import from client code.

/** One option of a line and its chance in % (as listed on msu.io, rounded to 6 decimals). */
export type ProbabilityOption = { option: string; probability: number };

export type PotentialProbability = {
  cube: string;
  grade: string;
  part: string;
  /** the level actually sent (at most 120; every level above uses the same table) */
  level: number;
  /** equipLevelMin/Max of the response, when given */
  levelRange: [number, number] | null;
  /** 1st, 2nd and 3rd line, in display order. [] when there is no table for the combination */
  lines: ProbabilityOption[][];
};
