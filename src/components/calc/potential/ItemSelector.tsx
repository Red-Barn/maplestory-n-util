"use client";

import ItemPicker from "@/components/ItemPicker";
import { POTENTIAL_KINDS, type PotentialKind } from "@/data/potential";
import { Field, gradeLabel, SELECT_CLASS } from "./fields";
import type { PotentialItem, Source } from "./usePotentialItem";

const SOURCES: { source: Source; label: string }[] = [
  { source: "equipped", label: "장착 장비" },
  { source: "name", label: "아이템 이름으로 찾기" },
];

/** Equipped item / item found by name, and potential vs bonus potential. */
export default function ItemSelector({ sel }: { sel: PotentialItem }) {
  const kindLabel = POTENTIAL_KINDS.find((k) => k.kind === sel.kind)!.label;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 border-b border-black/10 dark:border-white/15" role="tablist">
        {SOURCES.map((s) => (
          <button
            key={s.source}
            type="button"
            role="tab"
            aria-selected={sel.source === s.source}
            onClick={() => sel.setSource(s.source)}
            className={`-mb-px border-b-2 px-3 py-1.5 text-sm font-medium ${
              sel.source === s.source
                ? "border-orange-500 text-current"
                : "border-transparent text-zinc-500 hover:text-current"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sel.source === "equipped" ? (
          <Field
            label="장비"
            hint={
              sel.item &&
              (sel.detectedGrade > 0
                ? `이 장비의 ${kindLabel}: ${gradeLabel(sel.detectedGrade)} · 요구 레벨 ${sel.item.required.level}`
                : `이 장비에는 ${kindLabel}이 없습니다. 등급을 직접 고르세요.`)
            }
          >
            {sel.equipped.length > 0 ? (
              <select value={sel.slot} onChange={(e) => sel.setSlot(e.target.value)} className={SELECT_CLASS}>
                {sel.equipped.map((e) => (
                  <option key={e.slot} value={e.slot}>
                    {e.label} · {e.item.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="block text-sm text-zinc-500">잠재능력을 가진 장착 장비가 없습니다.</span>
            )}
          </Field>
        ) : (
          <Field
            label="아이템"
            group
            hint={
              sel.picked
                ? `${sel.picked.name} (ID ${sel.picked.id}${sel.level ? ` · 요구 레벨 ${sel.level}` : ""}). 등급은 직접 고르세요.`
                : "장비 이름 일부를 영문으로 입력하세요. 고르지 않으면 가격·부위·레벨을 직접 입력해 계산합니다."
            }
          >
            <ItemPicker onSelect={sel.setPicked} />
          </Field>
        )}

        <Field label="종류">
          <select
            value={sel.kind}
            onChange={(e) => sel.setKind(e.target.value as PotentialKind)}
            className={SELECT_CLASS}
          >
            {POTENTIAL_KINDS.map((k) => (
              <option key={k.kind} value={k.kind}>
                {k.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="text-[11px] text-zinc-500">큐브 가격은 장비마다 다르고 1분마다 바뀝니다.</p>
    </div>
  );
}
