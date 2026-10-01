"use client";

import {
  attackEfficiency,
  CRIT_REINFORCE_CYCLES,
  CRIT_REINFORCE_MAX_LEVEL,
  conversionRate,
  reinforceCdmg,
  uptime,
  type CritReinforceInput,
} from "@/lib/calc/hyper/critReinforce";

export type CritReinforceSettings = CritReinforceInput & { on: boolean };

export const DEFAULT_CRIT_REINFORCE: CritReinforceSettings = { on: false, level: CRIT_REINFORCE_MAX_LEVEL, cycle: 120 };

const LEVELS = Array.from({ length: CRIT_REINFORCE_MAX_LEVEL }, (_, i) => i + 1);

const field = "rounded border border-black/15 bg-transparent px-2 py-1 tabular-nums dark:border-white/20";
const pct = (v: number) => `${(Math.round(v * 100) / 100).toLocaleString()}%`;

/** "40,339,381,998" ↔ 40339381998; empty or invalid = not entered. */
const parseDps = (text: string): number | undefined => {
  const n = Number(text.replace(/[,\s]/g, ""));
  return text.trim() && Number.isFinite(n) && n > 0 ? n : undefined;
};
const showDps = (n?: number) => (n === undefined ? "" : n.toLocaleString());

/** Critical Reinforce inputs and what they turn into, for Bowman jobs. */
export default function CritReinforceCard({
  settings,
  onChange,
  perCrit,
  critBefore,
  critAfter,
}: {
  settings: CritReinforceSettings;
  onChange: (next: CritReinforceSettings) => void;
  /** average extra crit damage % per 1% crit rate; undefined until both DPS values are entered */
  perCrit?: number;
  critBefore: number;
  critAfter: number;
}) {
  const set = (patch: Partial<CritReinforceSettings>) => onChange({ ...settings, ...patch });
  const efficiency = attackEfficiency(settings.totalDps, settings.activeDps);

  return (
    <div className="space-y-2 rounded-lg border border-black/10 p-3 text-sm dark:border-white/15">
      <label className="flex cursor-pointer items-center gap-2 font-medium">
        <input type="checkbox" checked={settings.on} onChange={(e) => set({ on: e.target.checked })} />
        크리티컬 리인포스 반영
      </label>
      <p className="text-xs text-zinc-500">
        30초 동안 크리티컬 확률의 (20 + 스킬 레벨)%가 크리티컬 데미지에 더해집니다(100% 초과분 포함). 극딜 주기와
        DPS로 평균 크리티컬 데미지로 바꿔 최적화에 넣습니다.
      </p>
      {settings.on && (
        <>
          <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2">
            <span className="text-xs text-zinc-500">스킬 레벨</span>
            <select value={settings.level} onChange={(e) => set({ level: Number(e.target.value) })} className={field}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  Lv.{l} ({20 + l}%)
                </option>
              ))}
            </select>
            <span className="text-xs text-zinc-500">극딜 주기</span>
            <select value={settings.cycle} onChange={(e) => set({ cycle: Number(e.target.value) })} className={field}>
              {CRIT_REINFORCE_CYCLES.map((c) => (
                <option key={c} value={c}>
                  {c / 60}분
                </option>
              ))}
            </select>
            <span className="text-xs text-zinc-500">총 DPS</span>
            <DpsInput value={settings.totalDps} onChange={(totalDps) => set({ totalDps })} />
            <span className="text-xs text-zinc-500">리인포스 중 DPS</span>
            <DpsInput value={settings.activeDps} onChange={(activeDps) => set({ activeDps })} />
          </div>
          {perCrit === undefined || efficiency === undefined ? (
            <p className="text-xs text-amber-600">DPS 두 칸을 모두 입력하면 최적화에 반영됩니다.</p>
          ) : (
            <ul className="space-y-0.5 text-xs text-zinc-500">
              <li>
                공격 효율 {efficiency.toFixed(4)} × 지속 비율 {pct(uptime(settings.cycle) * 100)} × 환산{" "}
                {pct(conversionRate(settings.level) * 100)}
              </li>
              <li>크리티컬 확률 1%당 크리티컬 데미지 +{perCrit.toFixed(4)}%</li>
              <li>
                현재 크확 {pct(critBefore)} → 크뎀 +{pct(reinforceCdmg(critBefore, perCrit))}, 최적 크확 {pct(critAfter)} →
                크뎀 +{pct(reinforceCdmg(critAfter, perCrit))}
              </li>
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Number input that keeps what is typed and reports the parsed value. Uncontrolled: it mounts
 * only once the card is checked, after the saved settings are restored.
 */
function DpsInput({ value, onChange }: { value?: number; onChange: (v: number | undefined) => void }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="예: 40,339,381,998"
      defaultValue={showDps(value)}
      onChange={(e) => onChange(parseDps(e.target.value))}
      onBlur={(e) => {
        e.target.value = showDps(parseDps(e.target.value));
      }}
      className={`${field} text-right`}
    />
  );
}
