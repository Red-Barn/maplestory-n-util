import type { StatEffect, StatKey } from "./types";

/** Display names for stat keys. */
export const STAT_LABEL: Record<StatKey, string> = {
  STR: "STR",
  DEX: "DEX",
  INT: "INT",
  LUK: "LUK",
  HP: "최대 HP",
  MP: "최대 MP",
  ATT: "공격력",
  MATT: "마력",
  STR_FIXED: "STR(%미적용)",
  DEX_FIXED: "DEX(%미적용)",
  INT_FIXED: "INT(%미적용)",
  LUK_FIXED: "LUK(%미적용)",
  "STR%": "STR%",
  "DEX%": "DEX%",
  "INT%": "INT%",
  "LUK%": "LUK%",
  "ALL%": "올스탯%",
  "HP%": "최대 HP%",
  "MP%": "최대 MP%",
  "ATT%": "공격력%",
  "MATT%": "마력%",
  "AP%": "AP 투자 스탯%",
  "DMG%": "데미지%",
  "BOSS%": "보스 데미지%",
  "NORMAL%": "일반 몬스터 데미지%",
  "CRIT%": "크리티컬 확률%",
  "CDMG%": "크리티컬 데미지%",
  "IED%": "방어율 무시%",
  "FD%": "최종 데미지%",
};

const PCT_SUFFIX = /%$/;

/** Merge same-stat effects for display. IED/FD stay separate since they stack multiplicatively. */
export function mergeEffects(effects: StatEffect[]): StatEffect[] {
  const out: StatEffect[] = [];
  for (const e of effects) {
    const same = e.stat !== "IED%" && e.stat !== "FD%" && out.find((o) => o.stat === e.stat);
    if (same) same.value += e.value;
    else out.push({ stat: e.stat, value: e.value });
  }
  return out;
}

/** "공격력 +4", "크리티컬 확률 +20%" */
export function formatEffect({ stat, value }: StatEffect): string {
  const label = STAT_LABEL[stat];
  const rounded = Math.round(value * 100) / 100;
  const sign = rounded >= 0 ? "+" : "";
  return PCT_SUFFIX.test(label) ? `${label.replace(PCT_SUFFIX, "")} ${sign}${rounded}%` : `${label} ${sign}${rounded}`;
}
