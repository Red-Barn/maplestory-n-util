import { findJob } from "@/data/jobs";
import type { CharacterBundle } from "@/types/msu";
import { collectAbility, collectArcane, collectHyperStats, collectPets } from "./collectors/character";
import { collectEquipment } from "./collectors/equipment";
import { collectSets } from "./collectors/sets";
import { collectPassives, resolveBuffs } from "./collectors/skills";
import { estimateAp } from "./compute";
import type { StatContribution } from "./types";

/** Everything that is always on (no user toggles), plus the buffs the user can toggle. */
export function collectCharacter(bundle: CharacterBundle) {
  const { character, items, sets, skills } = bundle;
  const level = character.common.level;
  const job = findJob(character.common.job.jobCode);
  const permanent: StatContribution[] = [
    ...collectEquipment(items, level),
    ...collectSets(items, sets),
    ...collectArcane(character),
    ...collectHyperStats(character),
    ...collectAbility(character),
    ...collectPets(character),
    ...collectPassives(skills, job),
  ];
  return { job, level, ap: estimateAp(level, job), permanent, buffs: resolveBuffs(skills, job) };
}

export { apStatToFinal, computeStats, estimateAp } from "./compute";
export type { FinalStats } from "./compute";
export {
  collectUnion,
  collectUnionGrid,
  UNION_GRID_PER_CELL,
  type UnionGridInput,
  type UnionGridKey,
  type UnionInput,
} from "./collectors/union";
export {
  collectPresets,
  defaultPresetInput,
  presetValue,
  type PresetDef,
  type PresetInput,
  type PresetState,
} from "./collectors/presets";
export {
  collectChoices,
  defaultChoiceInput,
  selectedOption,
  type ChoiceDef,
  type ChoiceInput,
  type ChoiceOption,
} from "./collectors/choices";
export { MAIN_STATS } from "./types";
export type { ComputedStats, MainStat, StatContribution, StatKey } from "./types";
export { formatEffect, mergeEffects, STAT_LABEL } from "./labels";
export { collectCollectionSet } from "./collectors/collection";
