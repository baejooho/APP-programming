# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

손글씨 숫자(0–9) 인식 애플리케이션. 데스크톱 버전과 웹 버전으로 나뉘어 개발 중.
scikit-learn MLPClassifier(MNIST 학습) 모델을 두 버전이 공유한다.

## 전체 폴더 구조

```
Study-01/
├── desktop_version/
│   ├── digit_recognizer.py   # 메인 애플리케이션
│   ├── digit_recognizer.bat  # Windows 런처
│   ├── digit_model.pkl       # 공통 모델 (웹 버전도 참조, 3.8MB)
│   └── CLAUDE.md
├── web_version/
│   ├── app.py                # Flask 서버 + 전처리 로직
│   ├── run_web.bat           # 서버 시작 + 크롬 자동 오픈 런처
│   ├── templates/
│   │   └── index.html        # 캔버스 UI + JS
│   └── CLAUDE.md
└── CLAUDE.md                 # 이 파일
```

---

## 데스크톱 버전 (desktop_version/)

Python + tkinter 기반 데스크톱 손글씨 숫자 인식 애플리케이션.

### 실행 방법

```bash
cd desktop_version
python digit_recognizer.py

# Windows에서 콘솔 없이 실행
digit_recognizer.bat
```

### 의존성

```bash
pip install numpy Pillow scikit-learn joblib
```

### 아키텍처

**단일 파일 구성** — `digit_recognizer.py` 하나에 모든 로직 포함.

**모델 관리** — `load_or_train_model()`:
- `digit_model.pkl` 존재 시 즉시 로드
- 없으면 OpenML에서 MNIST 다운로드 후 훈련 (인터넷 필요)
- `Pipeline(StandardScaler + MLPClassifier(256, 128))` 구조

**이미지 전처리** — `preprocess_canvas()`:
1. PIL 이미지 → 그레이스케일 반전
2. Bounding box crop
3. 20×20 박스 리사이즈 (비율 유지)
4. `_center_by_mass()` — 픽셀 질량 중심 기반 28×28 정렬
5. 784차원 numpy 배열 반환

**GUI** — `DigitRecognizerApp` (tkinter):
- 280×280 드로잉 캔버스 (PIL 이중 버퍼링)
- 인식 / 지우기 버튼 (한국어 UI)
- 예측 결과 + 신뢰도 Progress bar + 10자리 확률 분포 막대

### 주요 상수

| 상수 | 값 | 설명 |
|---|---|---|
| `CANVAS_SIZE` | 280 | 드로잉 캔버스 크기 (px) |
| `MNIST_SIZE` | 28 | MNIST 출력 그리드 |
| `MNIST_BOX` | 20 | 숫자 피팅 박스 크기 |
| `BRUSH_RADIUS` | 7 | 브러시 반지름 (px) — 실제 선 굵기 14px |
| `MODEL_PATH` | `digit_model.pkl` | 저장 모델 경로 |

### 참고

- `digit_model.pkl` 삭제 시 다음 실행 시 자동 재훈련
- SSL 우회 코드(`ssl._create_unverified_context`) — Windows 환경 호환용

### 수정 이력

| 날짜 | 항목 | 내용 |
|---|---|---|
| 2026-03-17 | 최초 생성 | Study-01 루트에서 desktop_version/ 으로 이동 |
| 2026-03-17 | `BRUSH_RADIUS` | 14 → 7 (선 굵기 28px → 14px로 감소) |
| 2026-03-17 | UI 한국어 전환 | 창 제목·안내 문구·버튼·결과·신뢰도·경고 메시지 전체 한국어로 변경 |

---

## 웹 버전 (web_version/)

Flask 백엔드 + HTML/CSS/JavaScript 프론트엔드 웹 애플리케이션.

### 실행 방법

```bash
# 방법 1 — 배치 파일 더블클릭 (서버 시작 + 크롬 자동 오픈)
web_version/run_web.bat

# 방법 2 — 직접 실행
cd web_version
python app.py
# → http://127.0.0.1:5000
```

### 의존성

```bash
pip install numpy Pillow scikit-learn joblib flask
```

### 기술 스택

| 역할 | 기술 |
|---|---|
| 백엔드 | Python Flask (포트 5000) |
| 모델 추론 | scikit-learn (desktop_version 모델 공유) |
| 프론트엔드 | HTML5 Canvas + CSS + Vanilla JS |

### 아키텍처

**`app.py`** — Flask 서버:
- `GET /` → `templates/index.html` 렌더링
- `POST /predict` → base64 PNG 수신 → 전처리 → 예측 → JSON 응답 (`digit`, `confidence`, `probabilities`)
- 전처리 로직(`_center_by_mass`, `preprocess_image`)은 desktop 버전과 동일

**`templates/index.html`** — 단일 페이지 UI:
- 280×280 드로잉 캔버스 (마우스 + 터치 지원)
- 인식 / 지우기 버튼
- 예측 결과 + 신뢰도 바 + 10자리 확률 분포 막대
- `canvas.toDataURL('image/png')` → `/predict` POST → 결과 렌더링

### 주요 상수

| 상수 | 값 | 설명 |
|---|---|---|
| `CANVAS_SIZE` | 280 | 드로잉 캔버스 크기 (px) |
| `MNIST_SIZE` | 28 | MNIST 출력 그리드 |
| `MNIST_BOX` | 20 | 숫자 피팅 박스 크기 |
| `BRUSH_RADIUS` | 7 | 브러시 반지름 (px) — 실제 선 굵기 14px |

### 수정 이력

| 날짜 | 항목 | 내용 |
|---|---|---|
| 2026-03-17 | 최초 생성 | Flask 백엔드 + HTML 프론트엔드 구성 |
| 2026-03-17 | `BRUSH_RADIUS` | 14 → 7 (선 굵기 28px → 14px로 감소) |
| 2026-03-17 | `run_web.bat` | 서버 시작 + 크롬 자동 오픈 배치 파일 추가 |
