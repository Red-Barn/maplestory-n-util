"use client";

import type { LinkSkillDef } from "@/data/links";
import { linkValue, type LinkInput, type LinkState } from "@/lib/stats";

export type Field<K extends string> = { key: K; label: string; pct?: boolean; unit?: string };

const inputCls =
  "w-20 rounded border border-black/15 bg-transparent px-2 py-1 text-right tabular-nums dark:border-white/20";

export function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-black/10 p-3 dark:border-white/15">
      <h3 className="text-sm font-semibold">{title}</h3>
      {hint && <p className="mb-2 text-[11px] text-zinc-500">{hint}</p>}
      {children}
    </section>
  );
}

function NumberInput(props: { value?: number; decimal?: boolean; onChange: (v: number | undefined) => void }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      step={props.decimal ? "any" : 1}
      value={props.value ?? ""}
      placeholder="0"
      onChange={(e) => {
        const raw = Math.max(0, Number(e.target.value) || 0);
        const v = props.decimal ? raw : Math.floor(raw);
        props.onChange(v || undefined);
      }}
      className={inputCls}
    />
  );
}

export function NumberFields<K extends string>(props: {
  title: string;
  hint: string;
  fields: Field<K>[];
  values: Partial<Record<K, number>>;
  onChange: (next: Partial<Record<K, number>>) => void;
}) {
  return (
    <Panel title={props.title} hint={props.hint}>
      <div className="space-y-1.5">
        {props.fields.map((f) => (
          <label key={f.key} className="flex items-center justify-between gap-2 text-sm">
            <span>{f.label}</span>
            <span className="flex items-center gap-1">
              <NumberInput
                value={props.values[f.key]}
                decimal={f.pct}
                onChange={(v) => props.onChange({ ...props.values, [f.key]: v })}
              />
              <span className="w-5 text-[11px] text-zinc-500">{f.unit ?? (f.pct ? "%" : "")}</span>
            </span>
          </label>
        ))}
      </div>
    </Panel>
  );
}

const LINK_KEY_LABEL: Record<string, string> = {
  "CRIT%": "크리티컬 확률 %",
  "IED%": "방어율 무시 %",
  "BOSS%": "보스 데미지 %",
  "DMG%": "데미지 %",
  ATT_MATT: "공/마 +",
  ALL: "올스탯 +",
};

export function LinkSkills(props: { defs: LinkSkillDef[]; values: LinkInput; onChange: (next: LinkInput) => void }) {
  return (
    <Panel title="링크 스킬" hint="API 스탯에 포함된 링크 스킬 효과입니다. 레벨이 다르면 수치를 고쳐 주세요.">
      <ul className="space-y-2">
        {props.defs.map((d) => {
          const state: LinkState = props.values[d.id] ?? { on: true };
          const setOn = (on: boolean) => props.onChange({ ...props.values, [d.id]: { ...state, on } });
          const setValue = (i: number, v: number) => {
            const values = d.effects.map((_, j) => linkValue(d, state, j));
            values[i] = v;
            props.onChange({ ...props.values, [d.id]: { on: state.on, values } });
          };
          return (
            <li key={d.id} className="text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={state.on} onChange={(e) => setOn(e.target.checked)} />
                <span>
                  {d.name} <span className="text-[11px] text-zinc-500">Lv.{d.level}</span>
                </span>
              </label>
              {d.effects.map((e, i) => (
                <div key={i} className="mt-1 flex items-center justify-between gap-2 pl-6">
                  <span className="text-[11px] text-zinc-500">{LINK_KEY_LABEL[e.key] ?? e.key}</span>
                  <NumberInput
                    value={linkValue(d, state, i)}
                    decimal={e.key.endsWith("%")}
                    onChange={(v) => setValue(i, v ?? 0)}
                  />
                </div>
              ))}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
