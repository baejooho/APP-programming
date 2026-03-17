<!-- Created: 2026-03-17 -->

# CLAUDE.md — web_version

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개요

Flask 백엔드 + HTML/CSS/JavaScript 프론트엔드로 구성된 웹 손글씨 숫자 인식 애플리케이션.
`desktop_version/digit_model.pkl` (scikit-learn) 모델을 공유해서 사용한다.

## 실행 방법

```bash
# 방법 1 — 배치 파일 더블클릭 (서버 시작 + 크롬 자동 오픈)
run_web.bat

# 방법 2 — 직접 실행
cd web_version
python app.py
# → 브라우저에서 http://127.0.0.1:5000 접속
```

## 기술 스택

| 역할 | 기술 |
|---|---|
| 백엔드 | Python Flask (포트 5000) |
| 모델 추론 | scikit-learn (desktop_version 모델 공유) |
| 프론트엔드 | HTML5 Canvas + CSS + Vanilla JS |

## 아키텍처

**`app.py`** — Flask 서버:
- `GET /` → `templates/index.html` 렌더링
- `POST /predict` → base64 PNG 수신 → 전처리 → 예측 → JSON 응답 (`digit`, `confidence`, `probabilities`)
- 전처리 로직(`_center_by_mass`, `preprocess_image`)은 desktop 버전과 동일

**`templates/index.html`** — 단일 페이지 UI:
- 280×280 드로잉 캔버스 (마우스 + 터치 지원)
- 인식 / 지우기 버튼
- 예측 결과 + 신뢰도 바 + 10자리 확률 분포 막대
- `canvas.toDataURL('image/png')` → `/predict` POST → 결과 렌더링

## 파일 구조

```
web_version/
├── app.py                # Flask 서버 + 전처리 로직
├── run_web.bat           # 서버 시작 + 크롬 자동 오픈 런처
├── templates/
│   └── index.html        # 캔버스 UI + JS
└── CLAUDE.md
```

## 주요 상수

| 상수 | 값 | 설명 |
|---|---|---|
| `CANVAS_SIZE` | 280 | 드로잉 캔버스 크기 (px) |
| `MNIST_SIZE` | 28 | MNIST 출력 그리드 |
| `MNIST_BOX` | 20 | 숫자 피팅 박스 크기 |
| `BRUSH_RADIUS` | 7 | 브러시 반지름 (px) — 실제 선 굵기 14px |

## 수정 이력

| 날짜 | 항목 | 내용 |
|---|---|---|
| 2026-03-17 | 최초 생성 | Flask 백엔드 + HTML 프론트엔드 구성 |
| 2026-03-17 | `BRUSH_RADIUS` | 14 → 7 (선 굵기 28px → 14px로 감소) |
| 2026-03-17 | `run_web.bat` | 서버 시작 + 크롬 자동 오픈 배치 파일 추가 |
