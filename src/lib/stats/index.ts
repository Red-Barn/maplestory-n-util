import { findJob } from "@/data/jobs";
import type { CharacterBundle } from "@/types/msu";
import { apiPetCount, collectAbility, collectArcane, collectHyperStats, collectPets } from "./collectors/character";
import { collectEquipment } from "./collectors/equipment";
import { collectSets } from "./collectors/sets";
import { collectPassives, resolveBuffs } from "./collectors/skills";
import { estimateAp } from "./compute";
import type { StatContribution } from "./types";

/**
 * Everything that is always on, plus the buffs the user can toggle. `permanent` is the whole
 * API state; the parts the user can change on the character page (hyper stat and ability
 * presets, number of pets) are also returned separately from the `fixed` rest.
 */
export function collectCharacter(bundle: CharacterBundle) {
  const { character, items, sets, skills } = bundle;
  const level = character.common.level;
  const job = findJob(character.common.job.jobCode);
  const fixed: StatContribution[] = [
    ...collectEquipment(items, level),
    ...collectSets(items, sets),
    ...collectArcane(character),
    ...collectPassives(skills, job),
  ];
  const hyper = collectHyperStats(character);
  const ability = collectAbility(character);
  const petCount = apiPetCount(character);
  const permanent = [...fixed, ...hyper, ...ability, ...collectPets(petCount)];
  return { job, level, ap: estimateAp(level, job), fixed, hyper, ability, petCount, permanent, buffs: resolveBuffs(skills, job) };
}

export { apStatToFinal, computeStats, estimateAp, sumStats } from "./compute";
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
export { collectPets, MAX_PETS, petAtt } from "./collectors/character";
export {
  abilityTypesForJob,
  API_PRESET,
  apiAbilityLines,
  apiHyperInput,
  collectAbilityLines,
  PRESET_SLOTS,
  type AbilityLine,
} from "./collectors/slots";
export { choicesForJob, effectsForJob, isRelevant, presetsForJob, type JobView } from "./relevance";
