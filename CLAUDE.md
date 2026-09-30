@AGENTS.md

# MapleStory N 유틸리티

전체 설계는 @docs/PLAN.md 참고 (캐릭터 불러오기 → 스탯 튜닝 엔진 → 이후 계산기들).

## 사용자 캐릭터
- 주력: RedBarn (Bowmaster Lv.244, `CHARd0irqke79c7c73dqmsb0`) — 스탯 엔진 검증 기준, 테스트 fixture
- 서브: BrownBarn (Aran Lv.225, `CHARd2a1t3838phs73a2d2j0`), OrangeBarn (Shade Lv.225, `CHARd2j9bd47lb2s73e8hmeg`) — 둘 다 주스탯 STR / 부스탯 DEX / 공격력. 테스트 fixture 있음
- 샘플 수집: `node --env-file=.env.local scripts/probe.mjs <assetKey> <폴더>` → `docs/samples/<폴더>/`, 이어서 `node scripts/make-fixture.mjs <이름> <폴더>`

## 현재 진행 상황 (2026-09-29)
- 완료: 캐릭터 불러오기(지갑 주소 + 이름 필터), 캐릭터 페이지(장비·잠재 그리드, 스탯 패널), 스탯 엔진 1차, Vitest
- API에서 확인된 사실 (`docs/samples/`는 gitignore, 커밋용은 `scripts/make-fixture.mjs`로 만든 `src/lib/stats/__tests__/fixtures/`):
  - `/characters/{key}/items`에는 옵션이 없음 → 슬롯별 `/items/{assetKey}`로 잠재·에디셔널 라벨, `stats.*.{base,enhance,extra}`(기본/스타포스/추옵) 획득
  - 세트 효과: `/gamemeta/items/{itemId}/set`, 장착 아이템 `common.setItemId`로 개수 계산
  - `apStat`이 인게임 최종 스탯. **시즌 버프(보약)와 도감은 포함**, 스킬 버프(메용·샤프·에코 등)는 **미포함** (사용자 확인)
    → 시즌 버프 사용 여부는 캐릭터마다 다름: 캐릭터 목록 카드의 "시즌 버프 사용 중" 체크(localStorage `msn:season-buff`, 기본 해제)로 불러오기 전에 지정. 체크한 캐릭터만 시즌 버프가 기본 상태에 포함됨. 스킬 버프는 기본 해제 후 체크 시 더함. 버프 변화 = 기본 버프 상태 대비 변화량, 오차 = 현재(체크한 버프 반영) 계산값 − apStat
  - 사용자 입력 (스탯 패널 오른쪽 탭 카드): 드롭다운 = 링크 레벨 Lv.0~(`src/data/links.ts`), 도감 Lv.0~12(`src/data/collection.ts`) + 도감 세트 효과 올스탯 숫자 입력, 칭호(`src/data/miscItems.ts` TITLES) — 모두 `collectors/choices.ts`. 화살은 체크 프리셋(MISC_ITEMS). 유니온 점령 효과(칸 수)·공격대원은 숫자 입력. 길드 등은 미반영 (사용자가 하나씩 추가 예정 — 자동 보정은 쓰지 않음)
  - 스탯 표: "구성 스탯"(주/부스탯, %미적용, 공/마, 각종 %) → "총 스탯"(총 주스탯/부스탯/공격력)을 계산해 API와 비교. 직업의 주/부스탯·공격 타입만 표시, 일반 몬스터 데미지 미표시
  - 어빌리티 "상태이상 대상 추가 데미지"는 데미지%가 아님 (`parseOption`에서 조건부 문구 제외)
  - 주스탯 AP = 5×레벨+18 (Lv.244 → 1238, 사용자 확인), 나머지 스탯 AP는 4
  - 럭키 아이템(카오스 루타 모자 4종, `src/data/luckyItems.ts`)은 3개 이상 착용한 **장비 세트**에만 +1. 장신구 세트(모든 부위가 Accessory)는 제외
  - 펫: 펫 수(1/2/3마리 → 공마 3/14/30) + 펫장비(개당 공마 5). 펫과 펫장비는 한 세트(펫 수 = 펫장비 수)로 보고, 펫 수는 기타 탭에서 사용자가 선택(기본값만 `wearing.pet`의 펫 수).
  - 하이퍼 스탯·어빌리티: API는 적용 중인 프리셋만 줌 → "프리셋" 탭에서 `API` 또는 직접 입력한 프리셋 1~3 선택(`collectors/slots.ts`, 레벨별 수치는 `src/data/hyperStats.ts`, 어빌리티 종류는 `src/data/abilities.ts`). "변화" 열의 기준은 API 프리셋 + 스킬 버프 끔. 칭호·화살은 API에 없어 `src/data/miscItems.ts` 프리셋(링크 스킬과 같은 구조)
  - 민팅 불가 아이템(훈장, Pivotal Adventure Ring 등)은 `/gamemeta/items/{itemId}` 메타데이터로 기본 스탯·세트 번호를 얻음 (`src/lib/itemMeta.ts`). 메타데이터에 없는 효과는 이름 기준 `src/data/itemExtras.ts`
  - 특수 반지(S.Ring)는 API에 아예 없음 → `src/lib/manualItems.ts`가 모든 캐릭터에 올스탯 +4, 공마 +4 장비로 추가. 끼지 않은 캐릭터는 장착 장비의 "특수 반지 착용" 체크 해제(localStorage `msn:special-ring`, 기본 체크) → `CharacterSections`가 스탯 패널·장비 그리드 양쪽에서 제외
  - 유니온: 점령 효과 주/부스탯은 스탯% **적용**, 공격대원 주/부스탯은 스탯% **미적용** (사용자 확인)
  - 마켓 이름 검색(`filter.name`)은 OAuth(`msu-authorization`) 없이는 필터가 무시됨 → 이름 검색은 지갑 내 `name` 필터로 대체
  - 직업 데이터(`src/data/jobs/`): 주스탯/부스탯/공격 타입은 API `apStat`에서 가장 큰 스탯·공격력/마력으로 확인 (`jobs.test.ts`가 검증). 액티브 스킬에 붙은 패시브는 `passiveOnly`로 "[Passive Effect ...]" 부분만 파싱, 문장형 효과는 `effects`로 고정값 지정
  - 직업에 필요 없는 것 숨기기(`src/lib/stats/relevance.ts`): 다른 주스탯·반대 공격 타입은 버프/링크/도감/칭호 효과 설명에서 제외("공/마" → 직업의 공격 타입만), 효과가 하나도 안 남는 드롭다운은 숨김. 특정 직업 전용 프리셋은 `onlyJobs`(화살 = Bowmaster)로 UI와 계산 모두에서 제외
  - 링크 레벨·칭호 기본값은 RedBarn 기준이라 다른 캐릭터에서는 직접 맞춰야 함
  - 캐시: `msuFetch`는 `unstable_cache`로 감쌈 (게이트 650ms·429 재시도는 캐시 미스에만). 첫 조회 ~15초, 이후 즉시
- 다음 할 일 (GitHub 이슈가 기준 — `gh issue list`):
  1. #7 Vercel 연동 (저장소 Import + 환경변수 `MSU_API_KEY`, Production Branch = `master`)
  2. #8 인게임 스탯창과 비교해 보정 없는 오차 줄이기 (AP 추정식 `estimateAp`, 기본 크리율, Marksmanship ATT% 해석 확인)
  3. #9 물약/소비·시너지 데이터(인게임 수치 확인 필요). 아란 Advanced Combo Ability의 콤보 공격력 +20이 스탯창에 반영되는지 인게임 확인 필요
  4. #10 계산기: 스탯 등가치 → 장비 교체 비교 → 스타포스/잠재/하이퍼스탯
- 이슈 추적 도입 전 작업은 closed 이슈 #2~#6에 기능 단위로 정리

## 개발 워크플로 (Gitflow + 이슈)
모든 작업(기능·버그·문서·오타)은 **이슈 → 브랜치 → PR** 순서로 진행한다. `master`, `develop`에 직접 커밋하지 않는다.

### 브랜치
| 종류 | 이름 | 분기 | 병합 대상 |
|---|---|---|---|
| 기능 | `feature/<이슈번호>-<짧은-설명>` | `develop` | `develop` (PR) |
| 버그 | `fix/<이슈번호>-<짧은-설명>` | `develop` | `develop` (PR) |
| 릴리스 | `release/vX.Y.Z` | `develop` | `master` + `develop`, 태그 `vX.Y.Z` |
| 긴급 수정 | `hotfix/<이슈번호>-<짧은-설명>` | `master` | `master` + `develop`, 태그 |

- `master` = 배포(Vercel production), `develop` = 통합(GitHub 기본 브랜치, PR 기본 대상).
- 릴리스(`develop` → `master`)는 사용자가 요청할 때만 한다.

### 작업 순서
1. **시작 전**: 이슈를 만들거나 기존 이슈를 고른다. 본문 = 배경, 계획 체크리스트, 완료 조건. 라벨: `enhancement`/`bug` + `stats-engine`/`calculator`/`data`/`infra`/`chore`.
2. **브랜치**: `develop`을 최신으로 받은 뒤 분기한다.
3. **진행 중**: 의미 있는 지점마다 이슈에 댓글을 남긴다 — 결정한 것과 이유, 막힌 점, 계획에서 달라진 점. 본문 체크리스트도 갱신한다.
4. **완료**: PR을 만들고(본문에 `Closes #N`), 이슈에 마무리 요약 댓글을 남긴다 — 바꾼 것, 주요 파일, 검증 결과(`npm test`, `npm run build`, 화면 확인), 남은 일·후속 이슈.
5. **병합**: PR은 만들어 두고 사용자가 확인한 뒤 병합한다(사용자가 바로 병합하라고 하면 `gh pr merge --merge --delete-branch`). squash·rebase는 쓰지 않는다.

- 이슈·PR·댓글은 한국어로, 사용자가 읽고 작업 내용을 파악할 수 있게 쓴다. 아주 작은 수정은 이슈 본문을 한두 줄로.
- 커밋 메시지는 영어 명령형 + 끝에 `(#이슈번호)`.
- 작업 중 범위 밖 문제를 발견하면 고치지 말고 새 이슈로 등록한다.

## 규칙
- API 키는 절대 클라이언트 코드나 커밋에 넣지 않는다 (`import "server-only"` 모듈에서만 사용).
- MSU API 기본 한도: 2 RPS / 3,000 RPD.
- Node/gh가 PATH에 없으면: `C:\Program Files\nodejs`, `C:\Program Files\GitHub CLI`.
