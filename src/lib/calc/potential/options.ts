// Option roll chances (which lines a cube gives at each grade) — not built yet, see issue #34.
// Kept apart from tierUp.ts so the two calculators don't depend on each other. The option tables
// will go in src/data/potential.ts next to the tier-up rates.

/** A set of lines the user wants, e.g. "boss damage 30% or more" — shape to be settled with the tables. */
export type OptionTarget = never;
