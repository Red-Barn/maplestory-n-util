import { COMMON_BUFFS, COMMON_PASSIVES, EXCLUSIVE_BLESSINGS } from "@/data/jobs/common";
import type { BuffDef, JobData, SkillRef } from "@/data/jobs";
import type { SkillEntry } from "@/types/msu";
import { parseOption } from "../parseOption";
import type { StatContribution, StatSource } from "../types";

function fromSkill(skills: SkillEntry[], ref: SkillRef, source: StatSource, label?: string): StatContribution[] {
  const skill = skills.find((s) => s.skillName === ref.name && s.skillLevel > 0);
  if (!skill) return [];
  return parseOption(skill.skillEffectDescription)
    .filter((e) => ref.pick.includes(e.stat))
    .map((e) => ({ ...e, source, label: label ?? `${skill.skillName} Lv.${skill.skillLevel}` }));
}

export function collectPassives(skills: SkillEntry[], job: JobData | undefined): StatContribution[] {
  const blessings = EXCLUSIVE_BLESSINGS.map((ref) => fromSkill(skills, ref, "skill"));
  const strongest = blessings.reduce<StatContribution[]>(
    (best, cur) => (sum(cur) > sum(best) ? cur : best),
    [],
  );
  const base: StatContribution[] = (job?.base ?? []).map((e) => ({ ...e, source: "base", label: `${job!.name} 기본` }));
  return [
    ...base,
    ...strongest,
    ...COMMON_PASSIVES.flatMap((ref) => fromSkill(skills, ref, "skill")),
    ...(job?.passives ?? []).flatMap((ref) => fromSkill(skills, ref, "skill")),
  ];
}

const sum = (cs: StatContribution[]) => cs.reduce((a, c) => a + c.value, 0);

export type ResolvedBuff = BuffDef & { contributions: StatContribution[] };

/** Buffs available to this character (only ones whose skill is learned, or with fixed effects). */
export function resolveBuffs(skills: SkillEntry[], job: JobData | undefined): ResolvedBuff[] {
  return [...COMMON_BUFFS, ...(job?.buffs ?? [])]
    .map((b) => {
      const contributions: StatContribution[] = [
        ...(b.effects ?? []).map((e) => ({ ...e, source: "job-buff" as const, label: b.name })),
        ...(b.skills ?? []).flatMap((ref) => fromSkill(skills, ref, "job-buff", b.name)),
      ];
      const learned = !b.skills || b.skills.some((ref) => skills.some((s) => s.skillName === ref.name && s.skillLevel > 0));
      return { ...b, contributions: learned ? contributions : [] };
    })
    .filter((b) => b.contributions.length > 0);
}
