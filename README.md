# 손글씨 숫자 인식기

손글씨로 쓴 숫자(0~9)를 AI가 인식하는 애플리케이션입니다.
데스크톱 버전과 웹 버전으로 나뉘어 개발되었습니다.

---

## 버전 소개

| 버전 | 기술 | 실행 방법 |
|---|---|---|
| 데스크톱 | Python + tkinter | `python digit_recognizer.py` |
| 웹 | Flask + HTML5 Canvas | `run_web.bat` 또는 `python app.py` |

---

## 빠른 시작

### 데스크톱 버전

```bash
cd desktop_version
pip install numpy Pillow scikit-learn joblib
python digit_recognizer.py
```

### 웹 버전

```bash
cd web_version
pip install flask numpy Pillow scikit-learn joblib
python app.py
# → 브라우저에서 http://127.0.0.1:5000 접속
```

또는 `web_version/run_web.bat` 더블클릭 (서버 시작 + 크롬 자동 오픈)

---

## 폴더 구조

```
Study-01/
├── desktop_version/
│   ├── digit_recognizer.py   # 메인 애플리케이션
│   ├── digit_recognizer.bat  # Windows 런처
│   └── digit_model.pkl       # 학습된 모델 (공유)
├── web_version/
│   ├── app.py                # Flask 서버
│   ├── run_web.bat           # 크롬 자동 실행 런처
│   └── templates/index.html  # 캔버스 UI
└── README.md
```

---

## CLAUDE.md 란?

> Claude Code가 매 세션 시작 시 자동으로 읽어들이는 마크다운 파일이에요.
> 프로젝트별 지침을 담아두면, 매번 프롬프트에 반복해서 작성할 필요가 없어져요.

**왜 필요한가요?**
Claude는 이전 세션에 대한 기억 없이 매 세션을 새로 시작해요. 코드 스타일, 실행 방법, 프로젝트 구조를 모르는 상태로 시작하기 때문에 CLAUDE.md에 한 번 써두면 매번 설명하지 않아도 됩니다.

**이 프로젝트의 CLAUDE.md 구조**

| 파일 | 역할 |
|---|---|
| `CLAUDE.md` (루트) | 전체 프로젝트 개요 + 데스크톱/웹 통합 안내 |
| `desktop_version/CLAUDE.md` | 데스크톱 버전 전용 상세 가이드 |
| `web_version/CLAUDE.md` | 웹 버전 전용 상세 가이드 |

**어떻게 시작하나요?**
`/init` 명령어로 프로젝트 구조를 분석해 CLAUDE.md를 자동 생성할 수 있어요.

> 💡 파일명은 반드시 **CLAUDE.md** (대문자) 형식이어야 합니다.

---

## 수정 이력

| 날짜 | 내용 |
|---|---|
| 2026-03-17 | 최초 생성 — 단일 Python 파일 |
| 2026-03-17 | desktop_version / web_version 으로 분리 |
| 2026-03-17 | BRUSH_RADIUS 14 → 7 (선 굵기 감소) |
| 2026-03-17 | UI 한국어 전환 (데스크톱) |
| 2026-03-17 | run_web.bat 추가 (웹 자동 실행) |
