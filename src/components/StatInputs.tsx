"use client";

import { presetValue, type PresetDef, type PresetInput, type PresetState } from "@/lib/stats";

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

const EFFECT_LABEL: Record<string, string> = {
  "CRIT%": "크리티컬 확률 %",
  "IED%": "방어율 무시 %",
  "BOSS%": "보스 데미지 %",
  "DMG%": "데미지 %",
  ATT: "공격력 +",
  ATT_MATT: "공/마 +",
  ALL: "올스탯 +",
};

/** Checkbox list of fixed-effect bundles (link skills, title, arrows) with editable values. */
export function PresetList(props: {
  title: string;
  hint: string;
  defs: PresetDef[];
  values: PresetInput;
  onChange: (next: PresetInput) => void;
}) {
  return (
    <Panel title={props.title} hint={props.hint}>
      <ul className="space-y-2">
        {props.defs.map((d) => {
          const state: PresetState = props.values[d.id] ?? { on: true };
          const setOn = (on: boolean) => props.onChange({ ...props.values, [d.id]: { ...state, on } });
          const setValue = (i: number, v: number) => {
            const values = d.effects.map((_, j) => presetValue(d, state, j));
            values[i] = v;
            props.onChange({ ...props.values, [d.id]: { on: state.on, values } });
          };
          return (
            <li key={d.id} className="text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={state.on} onChange={(e) => setOn(e.target.checked)} />
                <span>
                  {d.name} {d.tag && <span className="text-[11px] text-zinc-500">{d.tag}</span>}
                </span>
              </label>
              {d.effects.map((e, i) => (
                <div key={i} className="mt-1 flex items-center justify-between gap-2 pl-6">
                  <span className="text-[11px] text-zinc-500">{EFFECT_LABEL[e.key] ?? e.key}</span>
                  <NumberInput
                    value={presetValue(d, state, i)}
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
