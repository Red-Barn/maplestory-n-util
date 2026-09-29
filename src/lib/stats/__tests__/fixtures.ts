import type { CharacterBundle } from "@/types/msu";
import redBarnJson from "./fixtures/redbarn.json";

/** RedBarn (Bowmaster Lv.244) — built by scripts/make-fixture.mjs from scripts/probe.mjs output */
export const redBarn = redBarnJson as unknown as CharacterBundle;
