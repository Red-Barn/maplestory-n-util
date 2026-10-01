# 잠재능력 계산기 (#34)

등급 업 계산만 구현돼 있다. 옵션 출현 확률은 자리만 있다(`src/lib/calc/potential/options.ts`, 페이지의 "옵션 출현 확률" 섹션).

## 등급 업 확률 (`src/data/potential.ts`)
출처: 이슈 #34에 사용자가 준 표 그대로. 큐브 1개당 한 단계 오를 확률.

| 큐브 (ID) | 종류 | Rare→Epic | Epic→Unique | Unique→Legendary |
|---|---|---|---|---|
| Occult Cube (2711000) | 잠재 | 0.9901% | – | – |
| Red Cube (5062009) | 잠재 | 6% | 1.8% | 0.3% |
| Black Cube (5062010) | 잠재 | 15% | 3.5% | 1% |
| Bonus Potential Cube (5062500) | 에디셔널 | 4.7619% | 1.9608% | 0.4975% |
| White Cube (5062503) | 에디셔널 | 4.7619% | 1.9608% | 0.4975% |

- 표의 "Bonus White Cube" = API의 "White Cube"(5062503) — 사용자 확인(2026-09-30).
- **Bonus Occult Cube(2730000)는 확률 미확인이라 제외.** 확인되면 `TIER_UP_CUBES`에 한 줄 추가.
- 등급 번호는 API의 옵션 `grade`와 같다: 1 Rare, 2 Epic, 3 Unique, 4 Legendary (0 = 등급 아래 옵션 줄). 장비의 등급 = 세 줄 중 가장 높은 `grade`.

## 계산 (`src/lib/calc/potential/tierUp.ts`)
- 기대 개수 = 1/p, 여러 단계는 합.
- N개 안에 성공할 확률 = 1 − (1 − p)^N.
- q(90%·99%) 기준 개수 = ⌈ln(1 − q) / ln(1 − p)⌉.
- 여러 단계 합계의 "N개 안에 목표 등급 도달 확률"과 90%·99% 개수는 단계를 차례로 통과하는 분포로 계산한다(큐브 1개마다 현재 단계의 확률로 다음 단계로 이동). 그래서 단계별 90% 개수를 더한 값보다 작다.
- 큐브가 지원하지 않는 단계가 끼면 계산하지 않는다(`tierUpPlan` → `null`). 화면에서는 목표 등급 목록에 아예 나오지 않는다.

## 가격
- `GET /api/enhancement/{itemId}`의 `cubes[큐브 ID]` = 그 장비에 큐브 1회 사용 비용(NESO). 장비마다 다르고 1분마다 바뀐다.
- 장착 장비를 고르면 자동 조회, 가격 칸에 직접 입력하면 그 값으로 계산. 시세가 0(미제공)이거나 조회에 실패하면 직접 입력.
- "아이템 이름으로 찾기": 공용 `ItemPicker`(#40, MSU 아이템 검색, 장비만)로 고른 아이템의 `id`로 같은 시세를 조회한다. 이름만으로는 잠재 등급을 알 수 없어 현재 등급은 직접 고른다. 아무것도 고르지 않으면 가격 직접 입력으로 계산(이전의 "장비 없이 계산"을 대신함).
- 민팅 불가 장비(훈장 등)와 특수 반지는 잠재능력이 없어 장비 목록에서 뺀다.

## 옵션 출현 확률 (`src/lib/calc/potential/options.ts`)
### 데이터
- 출처: msu.io 확률 공개 페이지(`/maplestoryn/gamestatus/probabilityitems?tab=CubeType_*`)의 "Search Probability"가 쓰는 공개 엔드포인트
  `GET https://msu.io/maplestoryn/api/msn/probability?cubeType=CubeType_RED&gradeType=GradeType_LEGENDARY&partsType=PartsType_WEAPON&equipLevel=120`.
  키 없이 호출되지만 CORS가 없어 서버 경유 필요 → 공용 라우트 `GET /api/potential/probability` (#42, 1일 캐시). **비공식 엔드포인트라 바뀔 수 있음.**
- 응답의 `probabilityInfos[0..2]` = 1·2·3번째 줄 표(각 합 100%, 표기는 소수 6자리 반올림). 2·3번째 줄은 이미 "현재 등급(Red 10%/1%) + 한 단계 아래 등급"이 섞인 값.
- 사이트는 레벨을 `min(level, 120)`으로 보냄 → 120 이상은 같은 표.
- 큐브 → `cubeType`: Occult `OCCULT`, Red `RED`, Black `BLACK`, Bonus Occult `BONUS_OCCULT`, Bonus Potential·White `BONUS_POTENTIAL`.
- Bonus Occult Cube 페이지에는 등급 업 표가 없고 레어 열만 있음 → 등급 업 계산기에서는 계속 제외.
- 부위: 장비 카테고리(tier2/tier3 라벨)로 자동 결정(`partOfCategory`), 화면에서 바꿀 수 있음. 포켓·뱃지는 해당 부위 없음.

### 줄 수 제한 (확률 페이지 문구, `OPTION_LIMITS`)
- 3줄 중 최대 1줄: Decent 스킬 계열, 피격 후 무적 시간 증가
- 3줄 중 최대 2줄: 피격 시 일정 확률로 데미지 무시, 피격 시 일정 확률로 무적
- 제한에 걸리면 다음 줄은 그 옵션을 빼고 뽑고, 각 확률 = 표기 확률 ÷ (100% − 제외된 옵션 확률 합).
- 무적 관련 두 규칙은 아직 확률표에서 문구를 보지 못해 페이지 설명으로 패턴을 정함(**확인 필요**).

### 계산
- 옵션 세트: 최대 3줄 `{ 효과, 최소 수치 }`, 최대 15개. 세트 안은 AND — 효과마다 3줄에 나온 그 효과의 합 ≥ 최소 수치(STR/DEX/INT/LUK %는 올스탯 % 포함). 같은 효과를 두 번 고르면 최소 수치를 더함. 세트끼리는 OR.
- (1번째, 2번째, 3번째 줄) 조합을 모두 열거해 충족한 조합의 확률을 더함 = 큐브 1개 성공 확률 p. 기대 개수 1/p, 90%·99% 개수는 등급 업과 같은 식.
- 사용자 예시(Red, 레전드리 무기): 공% 12 / 보공 40 / 방무 40 → 6개, 공% 9 / 보공 40 / 방무 40 → 10개 (테스트로 확인).
- 가정: 큐브를 쓰는 동안 등급은 그대로(등급 업이 일어나 표가 바뀌는 경우는 무시).
- 화면에서 확인용으로 줄별 옵션 확률 표(msu.io 표기 그대로)와 충족한 조합 목록(조합별 확률, 합계 = p)을 보여 줌.
