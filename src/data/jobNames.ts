// Account character lists only carry jobCode; names come from the detail endpoint.
// Only codes confirmed from real MSU responses (docs/samples) — extend as new ones are seen.
export const JOB_NAMES: Record<number, string> = {
  313: "Bowmaster",
  1400: "Night Walker",
  2004: "Luminous",
  2513: "Shade",
};

export const jobName = (code: number): string | undefined => JOB_NAMES[code];
