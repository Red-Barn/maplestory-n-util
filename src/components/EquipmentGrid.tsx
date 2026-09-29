"use client";

import { useEffect, useState } from "react";
import { ITEM_EXTRAS } from "@/data/itemExtras";
import { SPECIAL_RING_SLOT } from "@/lib/manualItems";
import type { MainStat } from "@/lib/stats/types";
import type { CharacterDetail, ItemDetail, ItemStats, PotentialLines, StatBreakdown } from "@/types/msu";

// Slot order roughly follows the in-game equipment window.
const SLOTS: [string, string][] = [
  ["cap", "모자"],
  ["faceAcc", "얼굴장식"],
  ["eyeAcc", "눈장식"],
  ["earAcc", "귀고리"],
  ["pendant1", "펜던트"],
  ["pendant2", "펜던트2"],
  ["clothes", "상의"],
  ["pants", "하의"],
  ["shoes", "신발"],
  ["gloves", "장갑"],
  ["cape", "망토"],
  ["shoulder", "어깨장식"],
  ["belt", "벨트"],
  ["ring1", "반지1"],
  ["ring2", "반지2"],
  ["ring3", "반지3"],
  ["ring4", "반지4"],
  [SPECIAL_RING_SLOT, "특수 반지"],
  ["weapon", "무기"],
  ["subWeapon", "보조무기"],
  ["emblem", "엠블렘"],
  ["pocket", "포켓"],
  ["badge", "뱃지"],
  ["medal", "훈장"],
];

type StatField = {
  field: Exclude<keyof ItemStats, "attackSpeed">;
  label: string;
  pct?: boolean;
  /** main stat / attack type this row belongs to, for the job filter in the summary */
  kind?: MainStat | "ATT" | "MATT";
  /** shown in the grid summary (otherwise detail only) */
  summary?: boolean;
};

const STAT_FIELDS: StatField[] = [
  { field: "str", label: "STR", kind: "STR", summary: true },
  { field: "dex", label: "DEX", kind: "DEX", summary: true },
  { field: "int", label: "INT", kind: "INT", summary: true },
  { field: "luk", label: "LUK", kind: "LUK", summary: true },
  { field: "pad", label: "공격력", kind: "ATT", summary: true },
  { field: "mad", label: "마력", kind: "MATT", summary: true },
  { field: "statr", label: "올스탯", pct: true, summary: true },
  { field: "damr", label: "데미지", pct: true, summary: true },
  { field: "bdr", label: "보스 데미지", pct: true, summary: true },
  { field: "imdr", label: "방어율 무시", pct: true, summary: true },
  { field: "maxHp", label: "최대 HP" },
  { field: "maxMp", label: "최대 MP" },
  { field: "maxHpr", label: "최대 HP", pct: true },
  { field: "maxMpr", label: "최대 MP", pct: true },
  { field: "pdd", label: "방어력" },
  { field: "speed", label: "이동속도" },
  { field: "jump", label: "점프력" },
];

const GRADE: Record<number, { name: string; cls: string }> = {
  1: { name: "레어", cls: "text-sky-600 dark:text-sky-400" },
  2: { name: "에픽", cls: "text-purple-600 dark:text-purple-400" },
  3: { name: "유니크", cls: "text-amber-600 dark:text-amber-400" },
  4: { name: "레전드리", cls: "text-green-600 dark:text-green-400" },
};

export type JobView = { mainStat: MainStat; subStats: MainStat[]; attackType: "ATT" | "MATT" };

const breakdown = (item: ItemDetail, f: StatField) => item.stats[f.field] as StatBreakdown | null | undefined;
const fmt = (v: number, pct?: boolean) => `${v > 0 ? "+" : ""}${v.toLocaleString()}${pct ? "%" : ""}`;

/** Summary stats relevant to the job (all main stats / both attack types when unknown). */
function summaryFields(job: JobView | undefined) {
  return STAT_FIELDS.filter((f) => {
    if (!f.summary) return false;
    if (!job || !f.kind) return true;
    if (f.kind === "ATT" || f.kind === "MATT") return f.kind === job.attackType;
    return f.kind === job.mainStat || job.subStats.includes(f.kind);
  });
}

function potentialOptions(lines: PotentialLines) {
  return lines ? [lines.option1, lines.option2, lines.option3].filter((o) => o != null) : [];
}

function GradeTag({ lines, title }: { lines: PotentialLines; title: string }) {
  const opts = potentialOptions(lines);
  if (opts.length === 0) return null;
  const grade = GRADE[Math.max(...opts.map((o) => o.grade))];
  return <span className={`text-[10px] font-semibold ${grade?.cls ?? ""}`}>{`${title} ${grade?.name ?? ""}`}</span>;
}

function ItemCard(props: { slotName: string; item: ItemDetail | null; iconUrl?: string; job?: JobView; onOpen: () => void }) {
  const { item } = props;
  const sf = item?.enhance.starforce.enhanced ?? 0;
  const sums = item
    ? summaryFields(props.job)
        .map((f) => ({ f, total: breakdown(item, f)?.total ?? 0 }))
        .filter((s) => s.total)
    : [];
  return (
    <button
      type="button"
      onClick={props.onOpen}
      disabled={!item}
      className="w-full space-y-1 rounded-lg border border-black/10 p-2 text-left hover:border-orange-500 disabled:hover:border-black/10 dark:border-white/15"
    >
      <div className="flex items-start gap-2">
        {props.iconUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- small external icons
          <img src={props.iconUrl} alt="" className="h-9 w-9 shrink-0 object-contain" />
        )}
        <div className="min-w-0">
          <p className="text-[11px] text-zinc-500">{props.slotName}</p>
          <p className="truncate text-xs font-medium">{item?.name ?? "정보 없음"}</p>
          <p className="flex flex-wrap gap-x-1.5">
            {sf > 0 && <span className="text-[10px] text-amber-500">★{sf}</span>}
            {item && <GradeTag lines={item.enhance.potential} title="잠재" />}
            {item && <GradeTag lines={item.enhance.bonusPotential} title="에디" />}
          </p>
        </div>
      </div>
      {sums.length > 0 && (
        <p className="text-[11px] leading-snug text-zinc-600 dark:text-zinc-400">
          {sums.map(({ f, total }) => `${f.label} ${fmt(total, f.pct)}`).join(" · ")}
        </p>
      )}
    </button>
  );
}

function PotentialBlock({ lines, title }: { lines: PotentialLines; title: string }) {
  const opts = potentialOptions(lines);
  if (opts.length === 0) return null;
  const grade = GRADE[Math.max(...opts.map((o) => o.grade))];
  return (
    <div>
      <p className={`text-xs font-semibold ${grade?.cls ?? ""}`}>
        {title} {grade && `(${grade.name})`}
      </p>
      {opts.map((o, i) => (
        <p key={i} className={`text-xs ${GRADE[o.grade]?.cls ?? ""}`}>
          {o.label}
        </p>
      ))}
    </div>
  );
}

function ItemDetailDialog({ item, slotName, iconUrl, onClose }: { item: ItemDetail; slotName: string; iconUrl?: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows = STAT_FIELDS.map((f) => ({ f, b: breakdown(item, f) })).filter(
    (r): r is { f: StatField; b: StatBreakdown } => !!r.b && (r.b.total !== 0 || r.b.base !== 0),
  );
  const extras = ITEM_EXTRAS[item.name] ?? [];
  const sf = item.enhance.starforce;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-lg bg-[var(--background)] p-4 shadow-xl"
      >
        <div className="flex items-start gap-3">
          {iconUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- small external icons
            <img src={iconUrl} alt="" className="h-12 w-12 shrink-0 object-contain" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-zinc-500">
              {slotName} · {item.category.tier3.label}
            </p>
            <p className="font-semibold">{item.name}</p>
            {sf.maxStarforce > 0 && (
              <p className="text-xs text-amber-500">
                ★ {sf.enhanced} / {sf.maxStarforce}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-sm text-zinc-500 hover:text-current" aria-label="닫기">
            ✕
          </button>
        </div>

        {item.manual && (
          <p className="text-[11px] text-zinc-500">API가 불러오지 못하는 장비라 직접 추가한 수치입니다.</p>
        )}
        {item.fromMetadata && (
          <p className="text-[11px] text-zinc-500">민팅 불가 아이템이라 게임 데이터의 기본 수치만 표시합니다.</p>
        )}

        {rows.length > 0 && (
          <table className="w-full text-xs tabular-nums">
            <thead className="text-zinc-500">
              <tr>
                <th className="py-1 text-left font-medium">스탯</th>
                <th className="py-1 text-right font-medium">기본</th>
                <th className="py-1 text-right font-medium">스타포스/강화</th>
                <th className="py-1 text-right font-medium">추가옵션</th>
                <th className="py-1 text-right font-medium">합계</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ f, b }) => (
                <tr key={`${f.field}`} className="border-t border-black/5 dark:border-white/10">
                  <td className="py-1">
                    {f.label}
                    {f.pct ? " %" : ""}
                  </td>
                  <td className="py-1 text-right">{b.base || "–"}</td>
                  <td className="py-1 text-right text-amber-600">{b.enhance || "–"}</td>
                  <td className="py-1 text-right text-sky-600">{b.extra || "–"}</td>
                  <td className="py-1 text-right font-medium">{fmt(b.total, f.pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {extras.length > 0 && (
          <div>
            <p className="text-xs font-semibold">고유 효과</p>
            {extras.map((e, i) => (
              <p key={i} className="text-xs">
                {e.stat} +{e.value}
              </p>
            ))}
          </div>
        )}

        <PotentialBlock lines={item.enhance.potential} title="잠재능력" />
        <PotentialBlock lines={item.enhance.bonusPotential} title="에디셔널 잠재능력" />
      </div>
    </div>
  );
}

export default function EquipmentGrid(props: {
  equip: CharacterDetail["wearing"]["equip"];
  items: Record<string, ItemDetail | null>;
  job?: JobView;
}) {
  const [open, setOpen] = useState<string>();
  const openSlot = SLOTS.find(([slot]) => slot === open);
  const openItem = open ? props.items[open] : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {SLOTS.filter(([slot]) => props.equip[slot] || props.items[slot]).map(([slot, label]) => (
          <ItemCard
            key={slot}
            slotName={label}
            item={props.items[slot] ?? null}
            iconUrl={props.equip[slot]?.imageUrl}
            job={props.job}
            onOpen={() => setOpen(slot)}
          />
        ))}
      </div>
      {openSlot && openItem && (
        <ItemDetailDialog
          item={openItem}
          slotName={openSlot[1]}
          iconUrl={props.equip[openSlot[0]]?.imageUrl}
          onClose={() => setOpen(undefined)}
        />
      )}
    </>
  );
}
