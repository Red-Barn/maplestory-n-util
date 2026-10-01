import { GRADE_TYPES, MAX_PROBABILITY_LEVEL, OPTION_CUBES, PARTS } from "@/data/potential";
import type { PotentialProbability } from "@/types/potentialProbability";

// Pure helpers for the potential option chances (the request is in potentialProbabilityFetch.ts).

/** Raw response of GET https://msu.io/maplestoryn/api/msn/probability */
export type RawProbability = {
  cubeType: string;
  gradeType: string;
  partsType: string;
  equipLevelMin?: number;
  equipLevelMax?: number;
  probabilityInfos: {
    probabilityInfo: { optionDescription: string; probability: string; displayOrder: number }[];
  }[];
};

export type ProbabilityQuery = { cube: string; grade: string; part: string; level: number };

const CUBE_TYPES = new Set<string>(OPTION_CUBES.map((c) => c.cubeType));
const GRADES = new Set<string>(Object.values(GRADE_TYPES));
const PART_TYPES = new Set<string>(PARTS.map((p) => p.part));
const MAX_LEVEL = 200;

/** Checks the query of /api/potential/probability; returns an error message when it's invalid. */
export function parseProbabilityQuery(
  params: URLSearchParams,
): { query: ProbabilityQuery } | { error: string } {
  const cube = params.get("cube") ?? "";
  const grade = params.get("grade") ?? "";
  const part = params.get("part") ?? "";
  const levelText = params.get("level") ?? "";
  if (!CUBE_TYPES.has(cube)) return { error: `cube는 ${[...CUBE_TYPES].join(", ")} 중 하나여야 합니다.` };
  if (!GRADES.has(grade)) return { error: `grade는 ${[...GRADES].join(", ")} 중 하나여야 합니다.` };
  if (!PART_TYPES.has(part)) return { error: "part 값이 올바르지 않습니다." };
  const level = Number(levelText);
  if (!/^\d+$/.test(levelText) || level < 1 || level > MAX_LEVEL) {
    return { error: `level은 1~${MAX_LEVEL} 정수여야 합니다.` };
  }
  // the site never sends more than 120: higher levels share that table
  return { query: { cube, grade, part, level: Math.min(level, MAX_PROBABILITY_LEVEL) } };
}

/** Raw response → per-line tables with numeric chances, in display order. */
export function toPotentialProbability(raw: RawProbability, query: ProbabilityQuery): PotentialProbability {
  const { equipLevelMin: min, equipLevelMax: max } = raw;
  return {
    cube: query.cube,
    grade: query.grade,
    part: query.part,
    level: query.level,
    levelRange: min !== undefined && max !== undefined ? [min, max] : null,
    lines: (raw.probabilityInfos ?? []).map((line) =>
      [...line.probabilityInfo]
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((o) => ({ option: o.optionDescription, probability: Number(o.probability) })),
    ),
  };
}
