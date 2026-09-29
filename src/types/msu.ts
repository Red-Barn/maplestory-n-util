// Shapes observed in docs/samples/*.json (MSU Open API v1rc1). Only fields we use are typed.

export type JobInfo = {
  classCode: number;
  className: string;
  jobCode: number;
  jobName: string;
};

/** GET /accounts/{wallet}/characters */
export type AccountCharacter = {
  assetKey: string;
  categoryNo: number;
  name: string;
  tokenId: string;
  data: {
    classCode: number;
    jobCode: number;
    combatPower: string;
    expr: string;
    imageUrl: string;
    level: number;
    world: number;
  };
};

export type AccountCharactersResponse = {
  characters: AccountCharacter[];
  hasMore: boolean;
  nextCursor?: string;
};

export type Category = {
  categoryNo: number;
  label: string;
  /** e.g. "Armor" vs "Accessory" under Item > Armor */
  tier2: { code: string; label: string };
  tier3: { code: string; label: string };
};

type Total = { total: number };

/** Final stats as shown in the in-game stat window. */
export type ApStat = {
  combatPower: string;
  str: Total;
  dex: Total;
  int: Total;
  luk: Total;
  hp: Total;
  mp: Total;
  att: Total;
  magicAtt: Total;
  damage: Total;
  bossMonsterDamage: Total;
  normalEnemyDamage: Total;
  finalDamage: Total;
  ignoreDefence: Total;
  criticalRate: Total;
  criticalDamage: Total;
  arcaneForce: Total;
  starforce: Total;
  [key: string]: Total | string;
};

export type HyperStatEntry = { code: number; desc: string; level: number } | null;

export type AbilityEntry = { code: number; desc: string; grade: number; level: number; values: number[] };

export type EquipSlotRef = {
  assetKey: string; // "" for non-mintable items (no detail available)
  imageUrl: string;
  itemId: number;
  mintable: boolean;
  tokenId: string;
} | null;

export type ArcaneSymbol = {
  arcaneForce: number;
  itemId: number;
  imageUrl: string;
  level: number;
  maxLevel: number;
  stat: Partial<Record<"str" | "dex" | "int" | "luk" | "hp", number>>;
};

/** GET /characters/{assetKey} → data.character */
export type CharacterDetail = {
  assetKey: string;
  category: Category;
  common: {
    name: string;
    level: number;
    expr: string;
    job: JobInfo;
    world: { code: number; name: string };
  };
  apStat: ApStat;
  hyperStat: Record<string, HyperStatEntry>;
  ability: Record<string, AbilityEntry | null>;
  image: { imageUrl: string };
  wearing: {
    equip: Record<string, EquipSlotRef>;
    /** pet1..pet3; petAcc is the pet's equipment */
    pet: Record<string, { itemId: number; imageUrl: string; petAcc: { itemId: number; imageUrl: string } | null } | null>;
    arcaneSymbols: { slots: ArcaneSymbol[]; totalArcaneForce: number };
  };
};

export type PotentialOption = { code: number; grade: number; label: string } | null;
export type PotentialLines = { option1: PotentialOption; option2: PotentialOption; option3: PotentialOption } | null;

/** base = item base, enhance = starforce/scrolls, extra = additional options (flame) */
export type StatBreakdown = { base: number; enhance: number; extra: number; total: number };

export type ItemStats = {
  str: StatBreakdown;
  dex: StatBreakdown;
  int: StatBreakdown;
  luk: StatBreakdown;
  maxHp: StatBreakdown;
  maxMp: StatBreakdown;
  pad: StatBreakdown; // ATT
  mad: StatBreakdown; // Magic ATT
  bdr: StatBreakdown; // boss damage %
  damr: StatBreakdown; // damage %
  imdr: StatBreakdown; // ignore defense %
  statr: StatBreakdown; // all stat %
  pdd: StatBreakdown;
  speed: StatBreakdown;
  jump: StatBreakdown;
  maxHpr: StatBreakdown | null;
  maxMpr: StatBreakdown | null;
  attackSpeed: number;
};

/** GET /items/{assetKey} → data.item */
export type ItemDetail = {
  /** Built from game metadata for non-mintable items (base stats only, no enhancements). */
  fromMetadata?: boolean;
  /** Not returned by the API at all; added from our own data (e.g. the special ring). */
  manual?: boolean;
  assetKey: string;
  name: string;
  category: Category;
  common: { itemId: number; itemName: string; maxStarforce: number; setItemId: number };
  enhance: {
    potential: PotentialLines;
    bonusPotential: PotentialLines;
    starforce: { enhanced: number; maxStarforce: number };
  };
  image: { iconImageUrl: string };
  required: { level: number };
  stats: ItemStats;
};

export type SkillEntry = {
  skillId: number;
  skillName: string;
  skillLevel: number;
  skillMasterLevel: number;
  skillDescription: string;
  skillEffectDescription: string;
  skillImageUrl: string;
};

/** GET /characters/{assetKey}/skills and /hyper-skill */
export type SkillsResponse = { skills: { tier: number; skills: SkillEntry[] }[] };

/** GET /gamemeta/items/{itemId}/set → data.itemSet */
export type ItemSet = {
  setId: number;
  setName: string;
  effects: { equipCount: number; desc: string[] }[];
};

/** What our /api/characters/[assetKey] route and character page work with. */
export type CharacterBundle = {
  character: CharacterDetail;
  items: Record<string, ItemDetail | null>; // keyed by equip slot
  sets: ItemSet[]; // sets that at least one equipped item belongs to
  skills: SkillEntry[]; // learned (level > 0) only, all tiers
};
