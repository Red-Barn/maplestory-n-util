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
      <PotentialCalculator items={bundle.items} />
    </div>
  );
}
