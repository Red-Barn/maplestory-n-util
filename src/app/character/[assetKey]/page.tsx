import type { Metadata } from "next";
import EquipmentGrid from "@/components/EquipmentGrid";
import StatPanel from "@/components/StatPanel";
import { getCharacterBundle } from "@/lib/character";
import { MsuApiError } from "@/lib/msu";

export const metadata: Metadata = { title: "캐릭터 · MapleStory N 유틸" };

export default async function CharacterPage({ params }: PageProps<"/character/[assetKey]">) {
  const { assetKey } = await params;

  let bundle;
  try {
    bundle = await getCharacterBundle(assetKey);
  } catch (e) {
    const message = e instanceof MsuApiError ? e.message : "캐릭터 정보를 불러오지 못했습니다.";
    return <p className="text-red-600">{message}</p>;
  }

  const { character, items } = bundle;
  const { common, apStat } = character;
  const missing = Object.entries(character.wearing.equip).filter(([slot, ref]) => ref && !items[slot]).length;

  return (
    <div className="space-y-8">
      <section className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- external character render */}
        <img src={character.image.imageUrl} alt="" className="h-28 w-28 object-contain" />
        <div>
          <h1 className="text-2xl font-semibold">{common.name}</h1>
          <p className="text-sm text-zinc-500">
            Lv.{common.level} ({common.expr}%) · {common.job.jobName} · {common.world.name}
          </p>
          <p className="mt-1 text-sm">
            전투력 <span className="font-semibold">{Number(apStat.combatPower).toLocaleString()}</span>
            <span className="ml-3 text-zinc-500">
              스타포스 {apStat.starforce.total} · 아케인포스 {apStat.arcaneForce.total}
            </span>
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">스탯</h2>
        <StatPanel bundle={bundle} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">장착 장비</h2>
        {missing > 0 && (
          <p className="text-xs text-zinc-500">
            민팅 불가 아이템 {missing}개는 API가 상세 옵션을 제공하지 않아 스탯 계산에서 빠집니다.
          </p>
        )}
        <EquipmentGrid equip={character.wearing.equip} items={items} />
      </section>
    </div>
  );
}
