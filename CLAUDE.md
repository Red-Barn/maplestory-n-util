@AGENTS.md

# MapleStory N 유틸리티

전체 설계는 @docs/PLAN.md 참고 (캐릭터 불러오기 → 스탯 튜닝 엔진 → 이후 계산기들).

## 현재 진행 상황 (2026-09-29)
- 완료: Next.js 16 스캐폴드, `src/lib/msu.ts`(서버 전용 API 래퍼), `scripts/probe.mjs`(API 샘플 수집), `.env.example`
- 다음 할 일:
  1. 사용자가 `.env.local`에 `MSU_API_KEY` 입력 → `node --env-file=.env.local scripts/probe.mjs <지갑주소> [캐릭터이름]` 실행
  2. `docs/samples/*.json` 실제 필드 기준으로 `src/types/msu.ts`, Route Handlers, UI 작성
  3. 스탯 튜닝 엔진 (잠재/에디셔널/환생의 불꽃/스킬의 주스탯%·부스탯%·올스탯%·공격력% 합산, 직업 상시버프, 물약/소비 버프 체크, 시너지 체크)
  4. `gh auth login` 후 `gh repo create maplestory-n-util --public --source . --push`, 이후 Vercel 연동

## 규칙
- API 키는 절대 클라이언트 코드나 커밋에 넣지 않는다 (`import "server-only"` 모듈에서만 사용).
- MSU API 기본 한도: 2 RPS / 3,000 RPD.
- Node/gh가 PATH에 없으면: `C:\Program Files\nodejs`, `C:\Program Files\GitHub CLI`.
