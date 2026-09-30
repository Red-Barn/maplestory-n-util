import { COMMON_BUFFS, COMMON_PASSIVES, EMPRESS_BLESSING, EXCLUSIVE_BLESSINGS } from "@/data/jobs/common";
import type { BuffDef, JobData, SkillRef } from "@/data/jobs";
import type { SkillEntry } from "@/types/msu";
import { parseOption } from "../parseOption";
import type { StatContribution, StatSource } from "../types";

const PASSIVE_PART_RE = /\[passive effects?[^\]]*\]/i;

/** Equipped weapon types: item category tier 3 labels, e.g. "Two-Handed Blunt", "Rosary". */
export type EquipTypes = { weapon?: string; subWeapon?: string };

// High Paladin: "Critical Damage +5% and DEF Ignored +10% when equipped with a #cTwo-Handed Blunt weapon#"
const WHEN_WEAPON_RE = /^(.*?)\s+when equipped with an?\s+(.+?)(?:\s+weapon)?$/i;
// Shield Mastery: "When shield or rosary is equipped -- ..., Attack Power: +10, ..."
const WHEN_SUB_RE = /^when\s+(.+?)\s+is equipped\s*--\s*(.*)$/i;

const sameType = (name: string, equipped: string | undefined) =>
  !!equipped && name.trim().toLowerCase() === equipped.toLowerCase();

/** Drops colour markup and the lines that only apply with a weapon type the character doesn't hold. */
function applicableText(text: string, equip: EquipTypes): string {
  return text
    .replace(/\\n/g, "\n")
    .split("\n")
    .map((raw) => {
      const line = raw.replace(/#c|#/g, "").trim();
      const weapon = line.match(WHEN_WEAPON_RE);
      if (weapon) return sameType(weapon[2], equip.weapon) ? weapon[1] : "";
      const sub = line.match(WHEN_SUB_RE);
      if (sub) return sub[1].split(/\s+or\s+/i).some((name) => sameType(name, equip.subWeapon)) ? sub[2] : "";
      return line;
    })
    .join("\n");
}

function fromSkill(
  skills: SkillEntry[],
  ref: SkillRef,
  source: StatSource,
  label?: string,
  equip: EquipTypes = {},
): StatContribution[] {
  const skill = skills.find((s) => s.skillName === ref.name && s.skillLevel > 0);
  if (!skill) return [];
  const full = applicableText(skill.skillEffectDescription, equip);
  const text = ref.passiveOnly ? (full.match(PASSIVE_PART_RE)?.[0] ?? "") : full;
  const parsed = parseOption(text)
    .filter((e) => ref.pick.includes(e.stat))
    .map((e) => ({ ...e, value: e.value * (ref.stacks ?? 1) }));
  return [...parsed, ...(ref.effects ?? [])].map((e) => ({
    ...e,
    source,
    label: label ?? `${skill.skillName} Lv.${skill.skillLevel}`,
  }));
}

/** Whether the API lists Empress's Blessing for this character (otherwise the user enters its level). */
export const hasApiEmpressBlessing = (skills: SkillEntry[]): boolean =>
  skills.some((s) => s.skillName === EMPRESS_BLESSING.name && s.skillLevel > 0);

/**
 * Blessing of the Fairy / Empress's Blessing — only the stronger applies. `empressLevel` is the
 * user-entered Empress's Blessing level, used when the API doesn't list the skill.
 */
export function collectBlessing(skills: SkillEntry[], empressLevel = 0): StatContribution[] {
  const blessings = EXCLUSIVE_BLESSINGS.map((ref) => fromSkill(skills, ref, "skill"));
  const level = Math.max(0, Math.min(Math.floor(empressLevel), EMPRESS_BLESSING.maxLevel));
  if (level > 0 && !hasApiEmpressBlessing(skills)) {
    const label = `${EMPRESS_BLESSING.name} Lv.${level}`;
    blessings.push((["ATT", "MATT"] as const).map((stat) => ({ stat, value: level, source: "skill", label })));
  }
  return blessings.reduce<StatContribution[]>((best, cur) => (sum(cur) > sum(best) ? cur : best), []);
}

/** Passive skills except the blessings (see collectBlessing). */
export function collectPassives(skills: SkillEntry[], job: JobData | undefined, equip: EquipTypes = {}): StatContribution[] {
  const base: StatContribution[] = (job?.base ?? []).map((e) => ({ ...e, source: "base", label: `${job!.name} 기본` }));
  return [
    ...base,
    ...COMMON_PASSIVES.flatMap((ref) => fromSkill(skills, ref, "skill")),
    ...(job?.passives ?? []).flatMap((ref) => fromSkill(skills, ref, "skill", undefined, equip)),
  ];
}

const sum = (cs: StatContribution[]) => cs.reduce((a, c) => a + c.value, 0);

export type ResolvedBuff = BuffDef & { contributions: StatContribution[] };

/** Buffs available to this character (only ones whose skill is learned, or with fixed effects). */
export function resolveBuffs(skills: SkillEntry[], job: JobData | undefined, equip: EquipTypes = {}): ResolvedBuff[] {
  return [...COMMON_BUFFS, ...(job?.buffs ?? [])]
    .map((b) => {
      const contributions: StatContribution[] = [
        ...(b.effects ?? []).map((e) => ({ ...e, source: "job-buff" as const, label: b.name })),
        ...(b.skills ?? []).flatMap((ref) => fromSkill(skills, ref, "job-buff", b.name, equip)),
      ];
      const learned = !b.skills || b.skills.some((ref) => skills.some((s) => s.skillName === ref.name && s.skillLevel > 0));
      return { ...b, contributions: learned ? contributions : [] };
    })
    .filter((b) => b.contributions.length > 0);
}
