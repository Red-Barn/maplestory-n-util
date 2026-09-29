export default function Loading() {
  return (
    <p className="text-sm text-zinc-500">
      캐릭터와 장비 정보를 불러오는 중… (API 호출 제한 때문에 처음 조회 시 10초 정도 걸릴 수 있습니다)
    </p>
  );
}
