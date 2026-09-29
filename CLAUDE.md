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
  - `apStat`이 인게임 최종 스탯. 최종뎀·데미지%는 기본 버프(메용·샤프·에코·스톰) 켠 상태와 일치
  - 유니온·링크·길드·칭호·민팅불가 아이템(훈장 등)은 API에 없음 → `calibrate()`가 차이를 "API 미제공 보정" 항목으로 채움
  - 마켓 이름 검색(`filter.name`)은 OAuth(`msu-authorization`) 없이는 필터가 무시됨 → 이름 검색은 지갑 내 `name` 필터로 대체
  - 캐시: `msuFetch`는 `unstable_cache`로 감쌈 (게이트 520ms는 캐시 미스에만). 첫 조회 ~15초, 이후 즉시
- 다음 할 일:
  1. Vercel 연동 (저장소 Import + 환경변수 `MSU_API_KEY`)
  2. 인게임 스탯창과 비교해 보정 없는 오차 줄이기 (AP 추정식 `estimateAp`, 기본 크리율, Marksmanship ATT% 해석 확인)
  3. 서브캐릭 직업 데이터(`src/data/jobs/aran.ts`, `shade.ts`), 물약/소비·시너지 데이터(인게임 수치 확인 필요)
  4. 계산기: 스탯 등가치 → 장비 교체 비교 → 스타포스/잠재/하이퍼스탯

## 규칙
- API 키는 절대 클라이언트 코드나 커밋에 넣지 않는다 (`import "server-only"` 모듈에서만 사용).
- MSU API 기본 한도: 2 RPS / 3,000 RPD.
- Node/gh가 PATH에 없으면: `C:\Program Files\nodejs`, `C:\Program Files\GitHub CLI`.
