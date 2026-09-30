"use client";

import {
  presetValue,
  selectedOption,
  type ChoiceDef,
  type ChoiceInput,
  type PresetDef,
  type PresetInput,
  type PresetState,
} from "@/lib/stats";
import type { PresetEffect } from "@/lib/stats/collectors/presets";

export type Field<K extends string> = { key: K; label: string; pct?: boolean; unit?: string };

// ---- building blocks ----

export function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[11px] leading-snug text-zinc-500">{children}</p>;
}

export function SubHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-1 mt-5 first:mt-0">
      <h4 className="text-xs font-semibold">{title}</h4>
      {hint && <p className="text-[11px] leading-snug text-zinc-500">{hint}</p>}
    </div>
  );
}

function NumberInput(props: { value?: number; decimal?: boolean; onChange: (v: number | undefined) => void; label: string }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      aria-label={props.label}
      min={0}
      step={props.decimal ? "any" : 1}
      value={props.value ?? ""}
      placeholder="0"
      onChange={(e) => {
        const raw = Math.max(0, Number(e.target.value) || 0);
        const v = props.decimal ? raw : Math.floor(raw);
        props.onChange(v || undefined);
      }}
      className="w-16 rounded border border-black/15 bg-transparent px-1.5 py-0.5 text-right text-sm tabular-nums focus:border-orange-500 focus:outline-none dark:border-white/20"
    />
  );
}

function Unit({ children }: { children?: string }) {
  return <span className="w-5 shrink-0 text-[11px] text-zinc-500">{children}</span>;
}

// ---- tabs ----

export type Tab = { id: string; label: string; badge?: number; content: React.ReactNode };

export function InputTabs({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (id: string) => void }) {
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div className="rounded-lg border border-black/10 dark:border-white/15">
      <div role="tablist" className="flex border-b border-black/10 dark:border-white/15">
        {tabs.map((t) => {
          const selected = t.id === current.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(t.id)}
              className={`-mb-px flex flex-1 items-center justify-center gap-1 border-b-2 px-1 py-2 text-xs font-medium ${
                selected ? "border-orange-500 text-current" : "border-transparent text-zinc-500 hover:text-current"
              }`}
            >
              {t.label}
              {!!t.badge && (
                <span className="rounded-full bg-black/[.06] px-1.5 text-[10px] tabular-nums dark:bg-white/10">{t.badge}</span>
              )}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="p-3 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto">
        {current.content}
      </div>
    </div>
  );
}

// ---- lists ----

export function FieldList<K extends string>(props: {
  fields: Field<K>[];
  values: Partial<Record<K, number>>;
  onChange: (next: Partial<Record<K, number>>) => void;
}) {
  return (
    <ul className="divide-y divide-black/5 dark:divide-white/10">
      {props.fields.map((f) => (
        <li key={f.key} className="flex items-center justify-between gap-2 py-1">
          <span className="text-sm">{f.label}</span>
          <span className="flex items-center gap-1">
            <NumberInput
              label={f.label}
              value={props.values[f.key]}
              decimal={f.pct}
              onChange={(v) => props.onChange({ ...props.values, [f.key]: v })}
            />
            <Unit>{f.unit ?? (f.pct ? "%" : "")}</Unit>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CheckList(props: {
  items: { id: string; name: string; description?: string }[];
  checked: Record<string, boolean>;
  onChange: (id: string, on: boolean) => void;
}) {
  return (
    <ul className="divide-y divide-black/5 dark:divide-white/10">
      {props.items.map((it) => (
        <li key={it.id} className="py-1.5">
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={!!props.checked[it.id]}
              onChange={(e) => props.onChange(it.id, e.target.checked)}
            />
            <span>
              {it.name}
              {it.description && <span className="block text-[11px] leading-snug text-zinc-500">{it.description}</span>}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

const EFFECT_LABEL: Record<string, string> = {
  "CRIT%": "크확",
  "CDMG%": "크뎀",
  "IED%": "방무",
  "BOSS%": "보공",
  "DMG%": "데미지",
  ATT: "공격력",
  MATT: "마력",
  ATT_MATT: "공/마",
  ALL: "올스탯",
};

export function describeEffects(effects: PresetEffect[]): string {
  return effects.map((e) => `${EFFECT_LABEL[e.key] ?? e.key} +${e.value}${e.key.endsWith("%") ? "%" : ""}`).join(" · ");
}

/** Dropdown rows (link skill level, collection tier, title) with the chosen option's effects below. */
export function ChoiceList(props: {
  defs: ChoiceDef[];
  values: ChoiceInput;
  onChange: (next: ChoiceInput) => void;
}) {
  return (
    <ul className="divide-y divide-black/5 dark:divide-white/10">
      {props.defs.map((d) => {
        const option = selectedOption(d, props.values);
        // level 0 reads as the first level's stats at 0, e.g. "크확 +0%"
        const shown = option?.effects ?? (d.zeroEffects ? d.options[0]?.effects.map((e) => ({ ...e, value: 0 })) : undefined);
        return (
          <li key={d.id} className="py-1.5">
            <label className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">{d.name}</span>
              <select
                value={option?.id ?? ""}
                onChange={(e) => props.onChange({ ...props.values, [d.id]: e.target.value })}
                className="max-w-[60%] rounded border border-black/15 bg-[var(--background)] px-1.5 py-0.5 text-sm focus:border-orange-500 focus:outline-none dark:border-white/20"
              >
                <option value="">{d.noneLabel}</option>
                {d.options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {shown && <p className="mt-0.5 text-right text-[11px] leading-snug text-zinc-500">{describeEffects(shown)}</p>}
          </li>
        );
      })}
    </ul>
  );
}

/** Checkbox rows of fixed-effect bundles (arrows, ...) with editable values. */
export function PresetList(props: { defs: PresetDef[]; values: PresetInput; onChange: (next: PresetInput) => void }) {
  return (
    <ul className="divide-y divide-black/5 dark:divide-white/10">
      {props.defs.map((d) => {
        const state: PresetState = props.values[d.id] ?? { on: true };
        const setOn = (on: boolean) => props.onChange({ ...props.values, [d.id]: { ...state, on } });
        const setValue = (i: number, v: number) => {
          const values = d.effects.map((_, j) => presetValue(d, state, j));
          values[i] = v;
          props.onChange({ ...props.values, [d.id]: { on: state.on, values } });
        };
        return (
          <li key={d.id} className="flex items-start justify-between gap-2 py-1.5">
            <label className="flex min-w-0 cursor-pointer items-start gap-2 pt-0.5 text-sm">
              <input type="checkbox" className="mt-1" checked={state.on} onChange={(e) => setOn(e.target.checked)} />
              <span className="min-w-0">
                <span className="block truncate">{d.name}</span>
                {d.tag && <span className="block text-[11px] text-zinc-500">{d.tag}</span>}
              </span>
            </label>
            <span className={`flex shrink-0 flex-col items-end gap-1 ${state.on ? "" : "opacity-40"}`}>
              {d.effects.map((e, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="text-[11px] text-zinc-500">{EFFECT_LABEL[e.key] ?? e.key}</span>
                  <NumberInput
                    label={`${d.name} ${EFFECT_LABEL[e.key] ?? e.key}`}
                    value={presetValue(d, state, i)}
                    decimal={e.key.endsWith("%")}
                    onChange={(v) => setValue(i, v ?? 0)}
                  />
                  <Unit>{e.key.endsWith("%") ? "%" : ""}</Unit>
                </span>
              ))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
