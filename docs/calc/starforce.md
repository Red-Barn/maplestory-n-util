# 스타포스 계산기 (#33)

경로: `/character/{assetKey}/starforce` · 데이터 `src/data/starforce.ts` · 계산 `src/lib/calc/starforce/` · 화면 `src/components/calc/starforce/`

## 규칙과 출처
모든 수치는 사용자가 이슈 #33에 준 값이다(검색으로 채운 값 없음).

| 항목 | 값 | 출처 |
|---|---|---|
| 성공 확률 (0~24성) | 95, 90, 85, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 30, 30, 30, 30, 30, 30, 30, 3, 2, 1 (%) | 이슈 #33 |
| Major Failure | (1 − 성공) × n%. n: 12성 1, 13·14성 2, 15~17성 3, 18·19성 4, 20·21성 10, 22성 20, 23성 30, 24성 40 | 이슈 #33 |
| Keep / Drop | 1 − 성공 − Major Failure. Keep: 0~10, 15, 20성. Drop(−1성): 나머지 | 이슈 #33 |
| Major Failure 결과 | 무조건 10성 | 이슈 #33 |
| Star Catch | 성공 × 1.05 (성공이 오르면 Major Failure도 줄어듦) | 이슈 #33 |
| Protect | 12~16성 Major Failure 0%(그만큼 Keep/Drop), 비용 2배 | 이슈 #33 |
| Drop 2연속 | 다음 강화 100% 성공. 성공·Keep·Major Failure 시 초기화 | 이슈 #33 |
| Drop 연속 횟수에 11성 Drop 포함 | 포함한다 (12→11→10이면 10성에서 100%) | 사용자 답변 2026-09-30 |
| 100% 성공 강화의 Protect 비용 | 붙지 않는다(1배) | 사용자 답변 2026-09-30 |

## 계산
- 상태 = (현재 성, 연속 Drop 0/1/2). 연속 Drop 2인 상태의 강화는 100% 성공.
- `expectedToTarget(from, to, prices, opts)`: 목표 미만 상태들의 전이 행렬 P로 `(I − P)x = r`을 가우스 소거로 푼다. r에 1회 비용 / 1 / Major Failure 확률을 넣어 기대 비용·시도 횟수·Major Failure 횟수를 얻고, 전치 행렬로 성별 기대 시도 횟수(`attemptsAt`)를 얻는다. 성 범위는 `min(시작, 10)` ~ 목표−1.
- `simulateRuns` / `summarize`: 같은 체인을 시드 PRNG로 돌려 하위 10% / 중앙값 / 상위 10%를 낸다. 화면에서는 최대 10,000회, 총 시도 수가 약 1,000만을 넘지 않게 횟수를 줄이고 200회 미만이 되면 분포를 생략한다.
- 테스트(`__tests__/starforce.test.ts`): 표 25행 재현, Star Catch 95% → 99.75%, Protect, 0→10성 기대 시도 = Σ 1/성공확률, Drop 2연속 보장과 초기화, 시뮬레이션 평균 수렴.

## 가격
- `GET /api/enhancement/{itemId}` → `starforce[n]` = n성 → n+1성 1회 비용(NESO). 장착 장비의 `common.itemId`로 조회.
- 0은 "제공되지 않음". 2026-09-30 RedBarn 장비(itemId 1132272, 최대 25성)는 22~24성이 0으로 왔다 → 그 구간은 표에 직접 입력해야 기대 비용이 나온다.
- 표의 비용 칸에 직접 입력하면 API 값을 덮어쓴다(저장하지 않음).
- 목표 성 상한: 메타데이터의 `maxStarforce`까지 고를 수 있되, 가격 API가 0을 주는 성부터(`pricedUpTo`)는 "(가격 없음)"으로 표시한다. 예: Fafnir Wind Chaser(1452205)는 최대 25성인데 22~24성 가격이 0 (2026-10-01).

## 아이템 이름으로 찾기
- 화면 위 탭 "장착 장비" / "아이템 이름으로 찾기". 찾기는 공용 `ItemPicker`(#40, `/api/items/search`, 장비만)로 고르고, `GET /api/items/{itemId}`로 최대 스타포스·아이콘·요구 레벨을 받는다.
- 찾은 아이템은 0성에서 시작한다(현재 성은 드롭다운으로 바꿀 수 있음). `maxStarforce`가 0이면 강화 불가로 안내.

## 범위 밖 / 남은 일
- 성별 스탯 증가량과 데미지 효율: 수치 표가 없어 넣지 않음.
