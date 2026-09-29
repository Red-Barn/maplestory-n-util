import type { CharacterDetail, ItemDetail, PotentialLines } from "@/types/msu";

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
  ["weapon", "무기"],
  ["subWeapon", "보조무기"],
  ["emblem", "엠블렘"],
  ["pocket", "포켓"],
  ["badge", "뱃지"],
  ["medal", "훈장"],
];

const GRADE: Record<number, { name: string; cls: string }> = {
  1: { name: "레어", cls: "text-sky-600 dark:text-sky-400" },
  2: { name: "에픽", cls: "text-purple-600 dark:text-purple-400" },
  3: { name: "유니크", cls: "text-amber-600 dark:text-amber-400" },
  4: { name: "레전드리", cls: "text-green-600 dark:text-green-400" },
};

function Lines({ lines, title }: { lines: PotentialLines; title: string }) {
  const opts = lines ? [lines.option1, lines.option2, lines.option3].filter((o) => o != null) : [];
  if (opts.length === 0) return null;
  const grade = GRADE[Math.max(...opts.map((o) => o.grade))];
  return (
    <div>
      <p className={`text-[11px] font-semibold ${grade?.cls ?? ""}`}>
        {title} {grade && `(${grade.name})`}
      </p>
      {opts.map((o, i) => (
        <p key={i} className={`text-[11px] ${GRADE[o.grade]?.cls ?? ""}`}>
          {o.label}
        </p>
      ))}
    </div>
  );
}

function ItemCard({ slotName, item, iconUrl }: { slotName: string; item: ItemDetail | null; iconUrl?: string }) {
  const sf = item?.enhance.starforce.enhanced ?? 0;
  return (
    <div className="space-y-1 rounded-lg border border-black/10 p-2 dark:border-white/15">
      <div className="flex items-start gap-2">
        {iconUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- small external icons
          <img src={iconUrl} alt="" className="h-9 w-9 shrink-0 object-contain" />
        )}
        <div className="min-w-0">
          <p className="text-[11px] text-zinc-500">{slotName}</p>
          <p className="truncate text-xs font-medium">{item?.name ?? "상세 정보 없음"}</p>
          {sf > 0 && <p className="text-[11px] text-amber-500">★ {sf}</p>}
        </div>
      </div>
      {item && (
        <>
          <Lines lines={item.enhance.potential} title="잠재" />
          <Lines lines={item.enhance.bonusPotential} title="에디셔널" />
        </>
      )}
    </div>
  );
}

export default function EquipmentGrid({
  equip,
  items,
}: {
  equip: CharacterDetail["wearing"]["equip"];
  items: Record<string, ItemDetail | null>;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {SLOTS.filter(([slot]) => equip[slot]).map(([slot, label]) => (
        <ItemCard key={slot} slotName={label} item={items[slot] ?? null} iconUrl={equip[slot]?.imageUrl} />
      ))}
    </div>
  );
}
