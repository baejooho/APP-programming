# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# -대답은 "네,마스터님({이해도})"로 시작하며 {이해도}가 90%이하일 경우 이해도를 높일 수 있도록 추가적인 질문을 해줘
   - 진척도를 물었을 경우에는 반드시 "진척도:{진척도}%"라고 시작해줘

## 프로젝트 개요

상식 퀴즈 게임 — 순수 HTML/CSS/JavaScript(바닐라) 웹 앱.
프레임워크/빌드 도구 없음. 브라우저에서 직접 실행.

## 실행 방법

```bash
# 로컬 개발 서버 (fetch로 JSON 로드 시 CORS 필요)
npx serve .
# 또는
python -m http.server 8080
```

`index.html`을 브라우저에서 직접 열면 `questions.json` fetch가 CORS 오류를 낼 수 있으므로 반드시 로컬 서버를 통해 실행한다.

## 파일 구조 (목표 상태)

```
Study-03/
├── index.html          # 단일 HTML — 모든 화면(섹션)을 show/hide로 전환
├── style.css
├── data/
│   └── questions.json  # 전체 문제 데이터
└── js/
    ├── app.js          # 진입점, 화면 전환 및 전역 상태 관리
    ├── data.js         # questions.json 로드 및 필터링
    ├── quiz.js         # 문제 셔플, 출제 로직
    ├── score.js        # 점수 계산 순수 함수
    ├── timer.js        # 20초 타이머, 경과 시간 측정
    └── leaderboard.js  # LocalStorage 저장/조회
```

## 아키텍처 핵심 규칙

- **단일 HTML + 섹션 전환**: `<section id="screen-*">` 단위로 화면 구분, JS에서 `hidden` 속성으로 show/hide.
- **전역 상태**: `app.js`의 `gameState` 객체 하나로 닉네임·카테고리·난이도·현재 점수·힌트 사용 여부 등 모든 게임 상태를 관리.
- **score.js는 순수 함수만**: 상태를 직접 변경하지 않고, 인자를 받아 점수를 반환. `app.js`에서 호출 후 `gameState`에 반영.
- **timer.js**: 타이머 인스턴스는 문제 전환 시 반드시 `clearInterval` 후 재생성.

## 문제 데이터 구조

```json
{
  "id": "KH-001",
  "category": "한국사",
  "difficulty": "초급",
  "question": "...",
  "options": ["A", "B", "C", "D"],
  "answer": 0,
  "hint": "...",
  "explanation": "..."
}
```

- `answer`는 원본 `options` 배열 기준 인덱스. 보기 셔플 후 반드시 재계산 필요.
- `difficulty` 허용값: `"초급"` `"중급"` `"고급"`
- `category` 허용값: `"한국사"` `"과학"` `"지리"` `"일반상식"`

## 점수 규칙

| 조건 | 점수 |
|------|------|
| 초급 정답 | +5 |
| 중급 정답 | +10 |
| 고급 정답 | +15 |
| 7초 이내 정답 | +5 보너스 |
| 힌트 사용 후 정답 | 기본 점수 × 0.5 (소수점 버림) |
| 오답 / 타임오버 | 0 |

## 구현 프롬프트 및 체크리스트

`PROMPT_GUIDE.md` 참고 — 3단계 구현 프롬프트와 단계별 PRD 연결 체크리스트(총 85개) 포함.

## 퀴즈 문제 교차 검증 가이드라인
모든 문제 작성 시 확인 사항
1. 정답이 하나뿐인가?- 다른 해석 가능 시 조건 명시 (예: 면적 기준, 2024년 기준)
2. 최상급 표현에 기준이 있는가?- '가장 큰', '최초의' 등 표현에 측정 기준 명시
3. 시간과 범위가 명확한가?- 변할 수 있는 정보는 시점 명시- 지리적, 분류적 범위 한정
4. 교차 검증했는가?- 의심스러운 정보는 2개 이상 출처 확인
				- 논란 있는 내용은 주류 학설 기준
