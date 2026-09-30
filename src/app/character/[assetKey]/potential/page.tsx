import type { Metadata } from "next";
import PotentialCalculator from "@/components/calc/potential/PotentialCalculator";
import CharacterHeader from "@/components/CharacterHeader";
import { getCharacterBundle } from "@/lib/character";
import { MsuApiError } from "@/lib/msu";

export const metadata: Metadata = { title: "잠재능력 계산기 · MapleStory N 유틸" };

export default async function PotentialPage({ params }: PageProps<"/character/[assetKey]/potential">) {
  const { assetKey } = await params;

  let bundle;
  try {
    bundle = await getCharacterBundle(assetKey);
  } catch (e) {
    const message = e instanceof MsuApiError ? e.message : "캐릭터 정보를 불러오지 못했습니다.";
    return <p className="text-red-600">{message}</p>;
  }

  return (
    <div className="space-y-8">
      <CharacterHeader character={bundle.character} />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">잠재능력 등급 업</h2>
        <p className="text-xs text-zinc-500">
          큐브 하나를 쓸 때마다 정해진 확률로 등급이 한 단계 오릅니다. 목표 등급까지 필요한 큐브 개수와 비용을
          계산합니다.
        </p>
        <PotentialCalculator items={bundle.items} />
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">옵션 출현 확률</h2>
        <p className="text-sm text-zinc-500">준비 중입니다.</p>
      </section>
    </div>
  );
}
