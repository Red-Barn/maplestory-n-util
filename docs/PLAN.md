# MapleStory N 유틸리티 웹 — 1단계: 캐릭터 불러오기

## Context
MapleStory N 유틸 사이트(캐릭터 불러오기 → 스탯 등가치, 장비 변경 스탯 비교, 스타포스/잠재능력/하이퍼스탯 계산기)를 새로 만든다. 이번 범위는 **프로젝트 뼈대 + GitHub 공개 저장소 + 캐릭터 불러오기**. 이후 계산기들은 여기서 불러온 캐릭터 데이터를 재사용한다.

API: MSU Open API (`https://openapi.msu.io`, 헤더 `x-nxopen-api-key`, 기본 2 RPS / 3,000 RPD). 문서에 "키를 공개 저장소에 노출 금지" 명시 → 키는 서버(Next.js Route Handler)에서만 사용.

사용할 엔드포인트:
- `GET /v1rc1/accounts/{walletAddress}/characters` (쿼리: `name`, `cursor`, `size`) — 지갑 보유 캐릭터 목록
- `GET /v1rc1/search/characters?filter.name=...` — 이름 검색 (마켓 검색이라 판매 등록 캐릭터만 나올 수 있음 → UI에 안내)
- `GET /v1rc1/characters/{assetKey}` — 캐릭터 상세
- `GET /v1rc1/characters/{assetKey}/items` — 장착 아이템 (20개/페이지, cursor 페이징)
- (이후 단계) `/skills`, `/hyper-skill`, `/vmatrix`

## 결정 사항
- Next.js (App Router) + TypeScript + Tailwind, Vercel 배포 (GitHub 연동 자동 배포)
- 조회: 지갑 주소 입력 → 캐릭터 목록에서 선택, 이름 검색도 제공
- 폴더 `C:\Users\krtc0_bhc063n\maplestory-n-util`, GitHub **public** 저장소 `maplestory-n-util`

## 구현 단계
1. `npx create-next-app@latest maplestory-n-util --ts --tailwind --app --eslint --src-dir`
2. `.env.local`에 `MSU_API_KEY=...` (사용자가 직접 입력), `.env.example`만 커밋. `.gitignore`에 `.env*.local` 확인.
3. **API 응답 스키마 확보**: 문서에 character/item 필드가 명시되어 있지 않음 → 사용자 키로 실제 호출해 샘플 JSON을 `docs/samples/`에 저장(지갑주소 등 민감정보 제거) 후 타입 정의.
4. `src/lib/msu.ts` — 서버 전용 fetch 래퍼 (`import 'server-only'`): 베이스 URL, 키 헤더, `{success, data, error}` 언래핑, 에러 → 명확한 메시지, `next: { revalidate: 60 }` 캐시로 레이트리밋 완화.
5. `src/types/msu.ts` — 3단계 샘플 기반 타입.
6. Route Handlers (브라우저 → 우리 서버 → MSU):
   - `src/app/api/accounts/[wallet]/characters/route.ts`
   - `src/app/api/search/characters/route.ts`
   - `src/app/api/characters/[assetKey]/route.ts` (상세 + 아이템 전 페이지 합쳐 반환)
   - 입력 검증(지갑 주소 형식 `0x` + 40 hex, 이름 길이)
7. UI
   - `src/app/page.tsx` — 탭: [지갑 주소] / [캐릭터 이름] 검색 폼 → 결과 카드 목록
   - `src/app/character/[assetKey]/page.tsx` — 기본 정보(이름/직업/레벨/이미지), 스탯, 장착 장비 그리드(스타포스·잠재 표시)
   - 최근 조회 캐릭터를 localStorage에 저장 (편의 기능)
8. **스탯 튜닝 엔진** (아래 섹션) — API 원본 스탯만으로는 부족하므로 직접 합산/보정.
9. Git/GitHub: `git init` → 커밋 → `gh repo create maplestory-n-util --public --source . --push` (gh 로그인 여부 먼저 확인)
10. Vercel: 사용자가 vercel.com에서 저장소 Import + 환경변수 `MSU_API_KEY` 등록 (안내만; 원하면 `vercel` CLI로 진행)

## 스탯 튜닝 엔진
API가 주스탯%/부스탯%/공격력%와 버프 효과를 주지 않으므로, 모든 스탯을 **출처(source)별 기여분 목록**으로 모아 합산한다. 이후 등가치·장비 변경·잠재/하이퍼 계산기가 모두 이 엔진을 재사용한다.

### 데이터 모델 (`src/lib/stats/types.ts`)
- `StatKey`: STR/DEX/INT/LUK/HP (flat), `STR%`…/`ALL%`, `ATT`/`MATT` (flat), `ATT%`/`MATT%`, 데미지%, 보공%, 방무%, 크리율/크뎀 등
- `StatContribution { source: 'base'|'equip-base'|'starforce'|'flame'|'potential'|'bonus-potential'|'skill'|'job-buff'|'consumable'|'synergy'|'hyper'…, label, stat, value }`
- `ComputedStats`: 스탯별 합계 + 출처별 내역(툴팁/breakdown 표시용)

### 수집기 (`src/lib/stats/collectors/`)
1. `equipment.ts` — 아이템별 기본/스타포스/추가옵션(환생의 불꽃)/잠재/에디셔널 옵션 파싱. 옵션 문자열(예: "STR +9%", "올스탯 +6%", "공격력 +12%")을 `StatContribution`으로 바꾸는 파서 `parseOption.ts` (3단계 샘플 JSON으로 실제 포맷 확인 후 작성).
   - 주스탯% / 부스탯% / 올스탯% → 전 장비에서 합산
   - 공격력%/마력% → 무기·엠블렘·보조무기 잠재(+에디셔널)에서 합산
2. `skills.ts` — `/skills` 응답의 패시브 스킬 중 스탯% 주는 것을 **직업 데이터 테이블**과 매칭해 합산 (API가 수치를 주면 그대로, 아니면 스킬 레벨 × 테이블 값).
3. `jobBuffs.ts` — 직업별 **상시 유지 버프**(무한 지속 개인 버프)를 정적 데이터에서 자동 적용.
4. `consumables.ts` — 물약/버프 소비 아이템: 사용자 체크박스로 on/off.
5. `synergy.ts` (옵션) — 타 직업 시너지 버프: 체크박스로 on/off.

### 정적 데이터 (`src/data/`, 직접 정리해 커밋)
- `jobs/<jobId>.ts` — 주스탯/부스탯, 공격 타입(ATT/MATT), 패시브 스탯 스킬, 상시 버프 목록 `{ id, name, effects: [{stat, value}] }`
- `consumables.ts` — 물약/버프 아이템 `{ id, name, effects, stackGroup }` (같은 그룹끼리 중복 불가 처리)
- `synergies.ts` — 시너지 버프 `{ id, name, providerJob, effects }`
- 수치 출처(인게임/공식 가이드)를 주석으로 남기고, MapleStory N 직업 목록은 API 응답의 job 값을 기준으로 매핑. 첫 구현은 사용자의 본캐 직업부터 채우고 나머지 직업은 같은 형식으로 점진 추가.

### 최종 스탯 계산 (`src/lib/stats/compute.ts`)
- 주스탯 = (기본 AP + flat 합) × (1 + 스탯% 합 + 올스탯%) + %미적용 스탯
- 공격력 = flat ATT 합 × (1 + ATT% 합)
- 스탯 공격력(전투력용)은 직업 계수 테이블 사용
- API가 주는 최종 스탯(있다면)과 비교해 오차를 화면에 표시 → 데이터 튜닝 검증 지표로 사용

### UI (캐릭터 페이지)
- 스탯 패널: 각 수치 hover/클릭 시 출처별 breakdown
- 사이드 패널: [상시 버프(자동, 개별 off 가능)] [물약/소비 버프 체크] [시너지 체크(옵션)] → 체크 변경 시 즉시 재계산, 변화량(+/-) 표시
- 체크 상태는 localStorage에 캐릭터별 저장

## 검증
- `npm run dev` → 실제 지갑 주소로 목록 조회, 캐릭터 클릭 → 상세/장비 표시 확인
- 이름 검색 동작 범위 확인 (비판매 캐릭터가 검색되는지) 후 UI 안내 문구 조정
- 브라우저 DevTools Network 탭에서 `openapi.msu.io` 직접 호출이나 키 노출이 없는지 확인
- `git log`/GitHub에 `.env.local`이 올라가지 않았는지 확인
- `npm run build` 통과
- `parseOption`, `compute` 단위 테스트 (Vitest): 샘플 장비 옵션 → 기대 %합계, 버프 on/off 시 변화량
- 본인 캐릭터로 인게임 스탯창과 계산값 비교 (오차 허용 범위 확인 후 데이터 보정)
