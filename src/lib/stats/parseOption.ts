import type { StatEffect, StatKey } from "./types";

// Parses English option/effect strings from the MSU API, e.g.
//   potentials:  "DEX : +9%", "All Stats: +6%", "ATT: +12%", "STR per 10 Character Levels: +1"
//   hyper stats: "Dexterity +90", "Attack Power and Magic ATT: +12", "DEF Ignored: +3%"
//   skills:      "Permanently increase STR by 30 and DEX by 30.", "Attack Power: +60, Critical Damage: +16%"
// Unknown fragments are ignored (returned effects only cover stats the engine models).

type Target = { flat?: StatKey[]; pct?: StatKey[] };

// Longest aliases first so "Magic ATT" wins over "ATT", "Boss Monster Damage" over "Damage".
const ALIASES: [string, Target][] = (
  [
    ["attack power and magic att", { flat: ["ATT", "MATT"], pct: ["ATT%", "MATT%"] }],
    ["attack power & magic att", { flat: ["ATT", "MATT"], pct: ["ATT%", "MATT%"] }],
    // Aran's Maha Blessing: "Party Member Attack Power: + 30, Magic ATT: +30"
    ["party member attack power", { flat: ["ATT"] }],
    ["att & magic att", { flat: ["ATT", "MATT"], pct: ["ATT%", "MATT%"] }],
    ["maxhp / maxmp", { flat: ["HP", "MP"], pct: ["HP%", "MP%"] }],
    // Paladin's Light Charge: "Damage and HP Recovery:+5%"
    ["damage and hp recovery", { pct: ["DMG%"] }],
    ["damage against normal monsters", { pct: ["NORMAL%"] }],
    ["damage against normal enemies", { pct: ["NORMAL%"] }],
    ["damage to normal monsters", { pct: ["NORMAL%"] }],
    ["boss monster damage", { pct: ["BOSS%"] }],
    ["boss damage", { pct: ["BOSS%"] }],
    ["enemy def ignored", { pct: ["IED%"] }],
    ["def ignored", { pct: ["IED%"] }],
    ["ignore defense", { pct: ["IED%"] }],
    ["critical damage", { pct: ["CDMG%"] }],
    ["critical rate", { pct: ["CRIT%"] }],
    ["final damage", { pct: ["FD%"] }],
    ["magic att", { flat: ["MATT"], pct: ["MATT%"] }],
    ["attack power", { flat: ["ATT"], pct: ["ATT%"] }],
    // ability line "Attack: +6" ("Attack Speed: +2" has no number right after, so it stays ignored)
    ["attack", { flat: ["ATT"] }],
    ["att", { flat: ["ATT"], pct: ["ATT%"] }],
    ["all stats", { flat: ["STR", "DEX", "INT", "LUK"], pct: ["ALL%"] }],
    ["strength", { flat: ["STR"], pct: ["STR%"] }],
    ["dexterity", { flat: ["DEX"], pct: ["DEX%"] }],
    ["intelligence", { flat: ["INT"], pct: ["INT%"] }],
    ["luck", { flat: ["LUK"], pct: ["LUK%"] }],
    ["str", { flat: ["STR"], pct: ["STR%"] }],
    ["dex", { flat: ["DEX"], pct: ["DEX%"] }],
    ["int", { flat: ["INT"], pct: ["INT%"] }],
    ["luk", { flat: ["LUK"], pct: ["LUK%"] }],
    ["max hp", { flat: ["HP"], pct: ["HP%"] }],
    ["max mp", { flat: ["MP"], pct: ["MP%"] }],
    ["damage", { pct: ["DMG%"] }],
  ] as [string, Target][]
).sort((a, b) => b[0].length - a[0].length);

const PREFIX_RE = /^(?:\[?passive effects?\s*[:-]?\s*|permanently\s+|increases?\s+|increase\s+|your\s+)+/i;
const NUM_RE = /^\s*(?::|by)?\s*\+?\s*(\d+(?:\.\d+)?)\s*(%)?/i;
const PER_LEVEL_RE = /^per\s+(\d+)\s+character\s+levels?\s*:?\s*\+?\s*(\d+)/i;

// Conditional damage that isn't part of the stat window's Damage %,
// e.g. ability "+7% damage when attacking targets inflicted with Abnormal Status."
const CONDITIONAL_RE = /abnormal status|when attacking/i;

// Sentence-style IED, e.g. Marksmanship "ignores 25% of monster's Weapon DEF",
// Weapon Aura "Ignores 12% Enemy DEF for 100 sec".
const IGNORES_DEF_RE =
  /^ignores?\s+(\d+(?:\.\d+)?)%\s+(?:of\s+(?:the\s+)?(?:monster|enem(?:y|ies))'?s?'?\s+(?:weapon\s+)?def|enemy\s+def)/i;

export type ParseContext = { level?: number };

/** Parse one "<label> <value>" fragment. */
function parseFragment(fragment: string, ctx: ParseContext): StatEffect[] {
  if (CONDITIONAL_RE.test(fragment)) return [];
  let s = fragment.trim().replace(PREFIX_RE, "").replace(/[\]]/g, "").trim();
  const lower = s.toLowerCase();

  const ignoresDef = s.match(IGNORES_DEF_RE);
  if (ignoresDef) return [{ stat: "IED%", value: Number(ignoresDef[1]) }];

  // "+10% damage to normal monsters" (value first)
  const valueFirst = lower.match(/^\+?(\d+(?:\.\d+)?)(%)?\s+(.+)$/);
  if (valueFirst) {
    const alias = ALIASES.find(([a]) => valueFirst[3].startsWith(a));
    if (alias) return toEffects(alias[1], Number(valueFirst[1]), !!valueFirst[2]);
  }

  const alias = ALIASES.find(([a]) => lower.startsWith(a) && !/[a-z]/.test(lower[a.length] ?? ""));
  if (!alias) return [];
  const target = alias[1];
  s = s.slice(alias[0].length);

  const perLevel = s.trim().match(PER_LEVEL_RE);
  if (perLevel && target.flat) {
    const per = Number(perLevel[1]);
    const v = Math.floor((ctx.level ?? 0) / per) * Number(perLevel[2]);
    return target.flat.map((stat) => ({ stat, value: v }));
  }

  const m = s.match(NUM_RE);
  if (!m) return [];
  return toEffects(target, Number(m[1]), !!m[2]);
}

function toEffects(target: Target, value: number, isPct: boolean): StatEffect[] {
  const keys = isPct ? target.pct : target.flat;
  return (keys ?? []).map((stat) => ({ stat, value }));
}

/** Split on commas, sentence periods (not decimals), newlines and " and ". */
function splitFragments(text: string): string[] {
  return text
    .replace(/\\n/g, "\n")
    .split(/,|\.(?!\d)|\n|;/)
    .flatMap((part) => {
      // keep combined labels like "Attack Power and Magic ATT: +12" intact
      if (/attack power and magic att|damage and hp recovery/i.test(part)) return [part];
      return part.split(/\s+and\s+/i);
    })
    .map((p) => p.trim())
    .filter(Boolean);
}

export function parseOption(text: string, ctx: ParseContext = {}): StatEffect[] {
  return splitFragments(text).flatMap((f) => parseFragment(f, ctx));
}
