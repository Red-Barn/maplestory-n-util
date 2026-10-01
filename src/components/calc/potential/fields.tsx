import type { ReactNode } from "react";
import { GRADES } from "@/data/potential";

// Small form pieces shared by the potential calculators.

export const SELECT_CLASS =
  "w-full rounded border border-black/15 bg-[var(--background)] px-1.5 py-1 text-sm focus:border-orange-500 focus:outline-none dark:border-white/20";
export const INPUT_CLASS =
  "w-full rounded border border-black/15 bg-transparent px-1.5 py-1 text-right text-sm tabular-nums focus:border-orange-500 focus:outline-none dark:border-white/20";

export const gradeLabel = (grade: number) => GRADES.find((g) => g.grade === grade)?.label ?? "없음";
export const neso = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 6 });
/** fraction → "12.3456%" */
export const percent = (p: number, digits = 4) =>
  `${(p * 100).toLocaleString(undefined, { maximumFractionDigits: digits })}%`;

export const positive = (raw: string) => {
  const v = Number(raw);
  return Number.isFinite(v) && v > 0 ? v : undefined;
};

/** A labelled control. `group` renders a div instead of a label (for controls with several inputs/buttons). */
export function Field(props: { label: string; hint?: ReactNode; group?: boolean; children: ReactNode }) {
  const Tag = props.group ? "div" : "label";
  return (
    <Tag className="block space-y-1">
      <span className="block text-xs font-medium text-zinc-500">{props.label}</span>
      {props.children}
      {props.hint && <span className="block text-[11px] leading-snug text-zinc-500">{props.hint}</span>}
    </Tag>
  );
}

/** Price of one cube: the market price as placeholder, or what the user typed. */
export function PriceField(props: {
  value?: number;
  apiPrice?: number;
  hint: ReactNode;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <Field label="큐브 1개 가격 (NESO)" hint={props.hint}>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        value={props.value ?? ""}
        placeholder={props.apiPrice !== undefined ? String(props.apiPrice) : "직접 입력"}
        onChange={(e) => props.onChange(positive(e.target.value))}
        className={INPUT_CLASS}
      />
    </Field>
  );
}
