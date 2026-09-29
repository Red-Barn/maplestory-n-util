@AGENTS.md

# MapleStory N 유틸리티

전체 설계는 @docs/PLAN.md 참고 (캐릭터 불러오기 → 스탯 튜닝 엔진 → 이후 계산기들).

## 사용자 캐릭터
- 주력: RedBarn (Bowmaster Lv.244, `CHARd0irqke79c7c73dqmsb0`) — 스탯 엔진 검증 기준, 테스트 fixture
- 서브: BrownBarn (Aran), OrangeBarn (Shade) — 직업 데이터 미작성

## 현재 진행 상황 (2026-09-29)
- 완료: 캐릭터 불러오기(지갑 주소 + 이름 필터), 캐릭터 페이지(장비·잠재 그리드, 스탯 패널), 스탯 엔진 1차, Vitest
- API에서 확인된 사실 (`docs/samples/`는 gitignore, 커밋용은 `scripts/make-fixture.mjs`로 만든 `src/lib/stats/__tests__/fixtures/`):
  - `/characters/{key}/items`에는 옵션이 없음 → 슬롯별 `/items/{assetKey}`로 잠재·에디셔널 라벨, `stats.*.{base,enhance,extra}`(기본/스타포스/추옵) 획득
  - 세트 효과: `/gamemeta/items/{itemId}/set`, 장착 아이템 `common.setItemId`로 개수 계산
  - `apStat`이 인게임 최종 스탯. **시즌 버프(보약)와 도감은 포함**, 스킬 버프(메용·샤프·에코 등)는 **미포함** (사용자 확인)
    → 시즌 버프만 기본 체크, 스킬 버프는 기본 해제 후 체크 시 더함. 오차 = 기본 버프 상태 계산값 − apStat
  - 사용자 입력칸: 링크 스킬(`src/data/links.ts` 기본 6종), 칭호·화살(`src/data/miscItems.ts`), 유니온 점령 효과(칸 수), 유니온 공격대원(주/부스탯·크확·크뎀), 도감. 길드 등은 미반영 (사용자가 하나씩 추가 예정 — 자동 보정은 쓰지 않음)
  - 스탯 표: "구성 스탯"(주/부스탯, %미적용, 공/마, 각종 %) → "총 스탯"(총 주스탯/부스탯/공격력)을 계산해 API와 비교. 직업의 주/부스탯·공격 타입만 표시, 일반 몬스터 데미지 미표시
  - 어빌리티 "상태이상 대상 추가 데미지"는 데미지%가 아님 (`parseOption`에서 조건부 문구 제외)
  - 주스탯 AP = 5×레벨+18 (Lv.244 → 1238, 사용자 확인), 나머지 스탯 AP는 4
  - 럭키 아이템(카오스 루타 모자 4종, `src/data/luckyItems.ts`)은 3개 이상 착용한 **장비 세트**에만 +1. 장신구 세트(모든 부위가 Accessory)는 제외
  - 펫: `wearing.pet`에서 펫 수(1/2/3마리 → 공마 3/14/30)와 펫장비 수(개당 공마 5)로 자동 계산. 칭호·화살은 API에 없어 `src/data/miscItems.ts` 프리셋(링크 스킬과 같은 구조)
  - 민팅 불가 아이템(훈장, Pivotal Adventure Ring 등)은 `/gamemeta/items/{itemId}` 메타데이터로 기본 스탯·세트 번호를 얻음 (`src/lib/itemMeta.ts`). 메타데이터에 없는 효과는 이름 기준 `src/data/itemExtras.ts`
  - 특수 반지(S.Ring)는 API에 아예 없음 → `src/lib/manualItems.ts`가 모든 캐릭터에 올스탯 +4, 공마 +4 장비로 추가
  - 유니온: 점령 효과 주/부스탯은 스탯% **적용**, 공격대원 주/부스탯은 스탯% **미적용** (사용자 확인)
  - 마켓 이름 검색(`filter.name`)은 OAuth(`msu-authorization`) 없이는 필터가 무시됨 → 이름 검색은 지갑 내 `name` 필터로 대체
  - 캐시: `msuFetch`는 `unstable_cache`로 감쌈 (게이트 650ms·429 재시도는 캐시 미스에만). 첫 조회 ~15초, 이후 즉시
- 다음 할 일:
  1. Vercel 연동 (저장소 Import + 환경변수 `MSU_API_KEY`)
  2. 인게임 스탯창과 비교해 보정 없는 오차 줄이기 (AP 추정식 `estimateAp`, 기본 크리율, Marksmanship ATT% 해석 확인)
  3. 서브캐릭 직업 데이터(`src/data/jobs/aran.ts`, `shade.ts`), 물약/소비·시너지 데이터(인게임 수치 확인 필요)
  4. 계산기: 스탯 등가치 → 장비 교체 비교 → 스타포스/잠재/하이퍼스탯

## 규칙
- API 키는 절대 클라이언트 코드나 커밋에 넣지 않는다 (`import "server-only"` 모듈에서만 사용).
- MSU API 기본 한도: 2 RPS / 3,000 RPD.
- Node/gh가 PATH에 없으면: `C:\Program Files\nodejs`, `C:\Program Files\GitHub CLI`.
