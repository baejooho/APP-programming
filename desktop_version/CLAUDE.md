# Created: 2026-03-17

# CLAUDE.md — desktop_version

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개요

Python + tkinter 기반 데스크톱 손글씨 숫자 인식 애플리케이션.
scikit-learn MLPClassifier로 MNIST를 학습하고, GUI에서 직접 숫자를 그려 인식한다.

## 실행 방법

```bash
# GUI 실행
python digit_recognizer.py

# Windows에서 콘솔 없이 실행
digit_recognizer.bat
```

## 의존성

```bash
pip install numpy Pillow scikit-learn joblib
```

`requirements.txt`가 없으므로 위 명령어로 직접 설치.

## 아키텍처

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
- Recognize / Clear 버튼
- 예측 결과 + 신뢰도 Progress bar + 10자리 확률 분포 막대

## 파일 구조

```
desktop_version/
├── digit_recognizer.py   # 메인 애플리케이션
├── digit_recognizer.bat  # Windows 런처
├── digit_model.pkl       # 사전 훈련 모델 (3.8 MB, git 제외 권장)
└── CLAUDE.md
```

## 주요 상수

| 상수 | 값 | 설명 |
|---|---|---|
| `CANVAS_SIZE` | 280 | 드로잉 캔버스 크기 (px) |
| `MNIST_SIZE` | 28 | MNIST 출력 그리드 |
| `MNIST_BOX` | 20 | 숫자 피팅 박스 크기 |
| `BRUSH_RADIUS` | 7 | 브러시 반지름 (px) — 실제 선 굵기 14px |
| `MODEL_PATH` | `digit_model.pkl` | 저장 모델 경로 |

## 참고

- `digit_model.pkl` 삭제 시 다음 실행에 자동 재훈련
- SSL 우회 코드(`ssl._create_unverified_context`) — Windows 환경 호환용
- `digit_model.pkl`은 `web_version`에서도 공유 사용됨

## 수정 이력

| 날짜 | 항목 | 내용 |
|---|---|---|
| 2026-03-17 | 최초 생성 | Study-01 루트에서 desktop_version/ 으로 이동 |
| 2026-03-17 | `BRUSH_RADIUS` | 14 → 7 (선 굵기 28px → 14px로 감소) |
| 2026-03-17 | UI 한국어 전환 | 창 제목·안내 문구·버튼·결과·신뢰도·경고 메시지 전체 한국어로 변경 |
