import CharacterSearch from "@/components/CharacterSearch";

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">캐릭터 불러오기</h1>
        <p className="mt-1 text-sm text-zinc-500">지갑 주소로 보유 캐릭터를 불러와 장비와 스탯을 확인합니다.</p>
      </div>
      <CharacterSearch />
    </div>
  );
}
