import { bowmaster } from "./bowmaster";
import type { JobData } from "./types";

// Add new classes here in the same format as bowmaster.ts.
const JOBS: JobData[] = [bowmaster];

export function findJob(jobCode: number): JobData | undefined {
  return JOBS.find((j) => j.jobCodes.includes(jobCode));
}

export type { JobData, BuffDef, SkillRef } from "./types";
