import type { Metadata } from "next";
import CharacterHeader from "@/components/CharacterHeader";
import { getCharacterBundle } from "@/lib/character";
import { MsuApiError } from "@/lib/msu";

export const metadata: Metadata = { title: "스타포스 계산기 · MapleStory N 유틸" };

export default async function StarforcePage({ params }: PageProps<"/character/[assetKey]/starforce">) {
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
        <h2 className="text-lg font-semibold">스타포스 계산기</h2>
        <p className="text-sm text-zinc-500">준비 중입니다.</p>
      </section>
    </div>
  );
}
