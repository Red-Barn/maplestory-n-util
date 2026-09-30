"use client";

import { useEffect, useMemo, useState } from "react";
import { COLLECTION } from "@/data/collection";
import { HYPER_STATS } from "@/data/hyperStats";
import { EMPRESS_BLESSING, SEASON_BUFF_ID } from "@/data/jobs/common";
import { LINK_SKILLS } from "@/data/links";
import { MISC_ITEMS, TITLES } from "@/data/miscItems";
import { load, loadSeasonBuff, loadSpecialRing, pushRecent, save, saveSpecialRing, statPanelKey } from "@/lib/client/storage";
import { withoutSpecialRing } from "@/lib/manualItems";
import {
  abilityTypesForJob,
  API_PRESET,
  apiAbilityLines,
  apiHyperInput,
  choicesForJob,
  collectAbilityLines,
  collectBlessing,
  collectCharacter,
  collectChoices,
  collectCollectionSet,
  collectPets,
  collectPresets,
  collectUnion,
  collectUnionGrid,
  computeStats,
  defaultChoiceInput,
  defaultPresetInput,
  presetsForJob,
  type AbilityLine,
  type ChoiceInput,
  type PresetInput,
  type UnionGridInput,
  type UnionInput,
} from "@/lib/stats";
import type { CharacterBundle } from "@/types/msu";

const ALL_CHOICES = [...LINK_SKILLS, ...COLLECTION, ...TITLES];

export type CollectionSetInput = { ALL?: number };

/** Per-character settings kept in localStorage (statPanelKey). */
export type SavedStatInputs = {
  buffs?: Record<string, boolean>;
  union?: UnionInput;
  unionGrid?: UnionGridInput;
  /** link skill levels, collection tier, title */
  choices?: ChoiceInput;
  miscItems?: PresetInput;
  /** all stats from collection set effects */
  collectionSet?: CollectionSetInput;
  /** number of pets (each with its equipment); unset = the API's count */
  pets?: number;
  /** Empress's Blessing level, for characters the API doesn't list it for */
  empress?: number;
  /** hyper stat preset in use: API_PRESET or a slot, and the levels entered per slot */
  hyperPreset?: string;
  hyperPresets?: Record<string, ChoiceInput>;
  abilityPreset?: string;
  abilityPresets?: Record<string, AbilityLine[]>;
};

/**
 * The bundle with the equipment the user took off removed (the special ring, which the API
 * doesn't return and is assumed worn). Every page that computes stats should start from this.
 */
export function useWornBundle(bundle: CharacterBundle) {
  const assetKey = bundle.character.assetKey;
  const [specialRing, setRing] = useState(true);

  useEffect(() => {
    // localStorage is only readable after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRing(loadSpecialRing(assetKey));
  }, [assetKey]);

  const worn = useMemo(
    () => (specialRing ? bundle : { ...bundle, items: withoutSpecialRing(bundle.items) }),
    [bundle, specialRing],
  );
  const setSpecialRing = (on: boolean) => {
    setRing(on);
    saveSpecialRing(assetKey, on);
  };
  return { worn, specialRing, setSpecialRing };
}

/**
 * The character's stats with everything the user entered on the stat panel (buffs, links, union,
 * collection, presets, pets, ...), restored from localStorage. The stat panel edits these through
 * the setters; calculators read `result` / `withoutHyper` and the other derived values.
 */
export function useCharacterStats(bundle: CharacterBundle) {
  const { character } = bundle;
  const storageKey = statPanelKey(character.assetKey);

  const base = useMemo(() => collectCharacter(bundle), [bundle]);
  // Whether this character uses the season buff (set on the character list); off until it's read.
  const [season, setSeason] = useState(false);
  // Buffs the API stat snapshot includes: they start checked and count as "no buff change".
  const inSnapshot = useMemo(
    () => Object.fromEntries(base.buffs.map((b) => [b.id, b.id === SEASON_BUFF_ID ? season : b.defaultOn])),
    [base.buffs, season],
  );
  // Inputs the character can't use (other jobs' items, stats the job ignores) are left out.
  const jobName = character.common.job.jobName;
  const miscDefs = useMemo(() => presetsForJob(MISC_ITEMS, jobName, base.job), [jobName, base.job]);
  const linkDefs = useMemo(() => choicesForJob(LINK_SKILLS, base.job), [base.job]);
  const titleDefs = useMemo(() => choicesForJob(TITLES, base.job), [base.job]);

  const [buffs, setBuffs] = useState<Record<string, boolean>>(inSnapshot);
  const [union, setUnion] = useState<UnionInput>({});
  const [unionGrid, setUnionGrid] = useState<UnionGridInput>({});
  const [choices, setChoices] = useState<ChoiceInput>(() => defaultChoiceInput(ALL_CHOICES));
  const [miscItems, setMiscItems] = useState<PresetInput>(() => defaultPresetInput(MISC_ITEMS));
  const [collectionSet, setCollectionSet] = useState<CollectionSetInput>({});
  const [pets, setPets] = useState<number>();
  const [empress, setEmpress] = useState<number>();
  const [hyperPreset, setHyperPreset] = useState(API_PRESET);
  const [hyperPresets, setHyperPresets] = useState<Record<string, ChoiceInput>>({});
  const [abilityPreset, setAbilityPreset] = useState(API_PRESET);
  const [abilityPresets, setAbilityPresets] = useState<Record<string, AbilityLine[]>>({});

  useEffect(() => {
    // restore per-character settings and record this visit (localStorage is client-only)
    const saved = load<SavedStatInputs>(storageKey, {});
    /* eslint-disable react-hooks/set-state-in-effect */
    const usesSeason = loadSeasonBuff(character.assetKey);
    setSeason(usesSeason);
    setBuffs({
      ...Object.fromEntries(base.buffs.map((b) => [b.id, b.id === SEASON_BUFF_ID ? usesSeason : b.defaultOn])),
      ...saved.buffs,
    });
    if (saved.union) setUnion(saved.union);
    if (saved.unionGrid) setUnionGrid(saved.unionGrid);
    if (saved.choices) setChoices({ ...defaultChoiceInput(ALL_CHOICES), ...saved.choices });
    if (saved.miscItems) setMiscItems({ ...defaultPresetInput(MISC_ITEMS), ...saved.miscItems });
    if (saved.collectionSet) setCollectionSet(saved.collectionSet);
    setPets(saved.pets);
    setEmpress(saved.empress);
    setHyperPreset(saved.hyperPreset ?? API_PRESET);
    setHyperPresets(saved.hyperPresets ?? {});
    setAbilityPreset(saved.abilityPreset ?? API_PRESET);
    setAbilityPresets(saved.abilityPresets ?? {});
    /* eslint-enable react-hooks/set-state-in-effect */
    pushRecent({
      assetKey: character.assetKey,
      name: character.common.name,
      jobName: character.common.job.jobName,
      level: character.common.level,
      imageUrl: character.image.imageUrl,
    });
  }, [storageKey, base.buffs, character]);

  /** Saves the current inputs with `next` applied (call together with the matching setter). */
  const persist = (next: SavedStatInputs) =>
    save(storageKey, {
      buffs,
      union,
      unionGrid,
      choices,
      miscItems,
      collectionSet,
      pets,
      empress,
      hyperPreset,
      hyperPresets,
      abilityPreset,
      abilityPresets,
      ...next,
    } satisfies SavedStatInputs);

  // Hyper stat / ability presets: the API one, or a slot the user filled in (starts as a copy of it).
  const hyperDefs = useMemo(() => choicesForJob(HYPER_STATS, base.job), [base.job]);
  const hyperInput = useMemo(
    () => hyperPresets[hyperPreset] ?? apiHyperInput(character),
    [hyperPresets, hyperPreset, character],
  );
  const abilityLines = useMemo(
    () => abilityPresets[abilityPreset] ?? apiAbilityLines(character),
    [abilityPresets, abilityPreset, character],
  );
  const abilityTypes = useMemo(
    () => abilityTypesForJob(base.job, abilityLines.map((l) => l.type)),
    [base.job, abilityLines],
  );
  const chosenHyper = useMemo(
    () => (hyperPreset === API_PRESET ? base.hyper : collectChoices(HYPER_STATS, hyperInput, "hyper")),
    [hyperPreset, hyperInput, base.hyper],
  );
  const chosenAbility = useMemo(
    () =>
      abilityPreset === API_PRESET ? base.ability : collectAbilityLines(abilityLines, `어빌리티 프리셋 ${abilityPreset}`),
    [abilityPreset, abilityLines, base.ability],
  );
  const petCount = pets ?? base.petCount;
  const empressLevel = empress ?? EMPRESS_BLESSING.defaultLevel;

  // API-derived stats plus what the user typed in (the API includes these but doesn't list them).
  const known = useMemo(
    () => [
      ...base.fixed,
      ...collectBlessing(bundle.skills, empressLevel),
      ...collectPets(petCount),
      ...collectUnion(union),
      ...collectUnionGrid(unionGrid),
      ...collectChoices(LINK_SKILLS, choices, "link"),
      ...collectChoices(COLLECTION, choices, "collection"),
      ...collectCollectionSet(collectionSet.ALL),
      ...collectChoices(TITLES, choices, "misc-item"),
      ...collectPresets(miscDefs, miscItems, "misc-item"),
    ],
    [base.fixed, bundle.skills, empressLevel, petCount, union, unionGrid, choices, miscItems, collectionSet, miscDefs],
  );

  // Baseline = what the API snapshot includes: the API's hyper stat and ability presets, the
  // season buff if the character uses it, skill buffs off. "변화" is measured from it.
  const baseline = useMemo(
    () => [
      ...known,
      ...base.hyper,
      ...base.ability,
      ...base.buffs.filter((b) => inSnapshot[b.id]).flatMap((b) => b.contributions),
    ],
    [known, base.hyper, base.ability, base.buffs, inSnapshot],
  );
  /** Everything in effect except hyper stats — what a hyper stat calculator adds its own levels to. */
  const withoutHyper = useMemo(
    () => [...known, ...chosenAbility, ...base.buffs.filter((b) => buffs[b.id]).flatMap((b) => b.contributions)],
    [known, chosenAbility, base.buffs, buffs],
  );
  const active = useMemo(() => [...withoutHyper, ...chosenHyper], [withoutHyper, chosenHyper]);

  const result = useMemo(() => computeStats(active, base.ap), [active, base.ap]);
  const reference = useMemo(() => computeStats(baseline, base.ap), [baseline, base.ap]);

  return {
    base,
    season,
    miscDefs,
    linkDefs,
    titleDefs,
    hyperDefs,
    buffs,
    setBuffs,
    union,
    setUnion,
    unionGrid,
    setUnionGrid,
    choices,
    setChoices,
    miscItems,
    setMiscItems,
    collectionSet,
    setCollectionSet,
    petCount,
    setPets,
    empressLevel,
    setEmpress,
    hyperPreset,
    setHyperPreset,
    hyperPresets,
    setHyperPresets,
    hyperInput,
    abilityPreset,
    setAbilityPreset,
    abilityPresets,
    setAbilityPresets,
    abilityLines,
    abilityTypes,
    persist,
    known,
    withoutHyper,
    active,
    baseline,
    result,
    reference,
  };
}
