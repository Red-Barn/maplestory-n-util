import type { JobData } from "@/data/jobs";
import type { ChoiceDef } from "./collectors/choices";
import type { InputKey } from "./collectors/inputs";
import type { PresetDef } from "./collectors/presets";
import { MAIN_STATS, type MainStat, type StatKey } from "./types";

/** The parts of a job that decide which stats matter to it. */
export type JobView = Pick<JobData, "mainStat" | "subStats" | "attackType">;

/** "DEX", "DEX%", "DEX_FIXED" → DEX */
const mainStatOf = (stat: string): MainStat | undefined =>
  MAIN_STATS.find((s) => stat === s || stat === `${s}%` || stat === `${s}_FIXED`);

/**
 * Whether a stat does anything for the job: its main/sub stats and its attack type count,
 * the other main stats and the other attack type don't. Everything counts when the job is unknown.
 */
export function isRelevant(stat: StatKey, job: JobView | undefined): boolean {
  if (!job) return true;
  const main = mainStatOf(stat);
  if (main) return main === job.mainStat || job.subStats.includes(main);
  if (stat === "ATT" || stat === "ATT%") return job.attackType === "ATT";
  if (stat === "MATT" || stat === "MATT%") return job.attackType === "MATT";
  return true;
}

/**
 * Input effects as the job sees them: "ATT & Magic ATT" becomes its own attack type and
 * stats it doesn't use drop out. All stats stays, since it always includes the job's stats.
 */
export function effectsForJob<E extends { key: InputKey }>(effects: E[], job: JobView | undefined): E[] {
  if (!job) return effects;
  return effects.flatMap((e) => {
    if (e.key === "ATT_MATT") return [{ ...e, key: job.attackType }];
    if (e.key === "ALL") return [e];
    return isRelevant(e.key, job) ? [e] : [];
  });
}

/** Dropdowns with at least one option that does something for the job. */
export function choicesForJob(defs: ChoiceDef[], job: JobView | undefined): ChoiceDef[] {
  return defs.filter((d) => d.options.some((o) => effectsForJob(o.effects, job).length > 0));
}

/**
 * Presets the character can use: not limited to other jobs (`onlyJobs`, matched against the
 * API job name so it works without job data) and with some effect the job uses.
 */
export function presetsForJob(defs: PresetDef[], jobName: string, job: JobView | undefined): PresetDef[] {
  return defs.filter(
    (d) => (!d.onlyJobs || d.onlyJobs.includes(jobName)) && effectsForJob(d.effects, job).length > 0,
  );
}
