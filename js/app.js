/**
 * app.js
 * 전역 상태 관리 및 화면 전환 담당
 */

/** 게임 전체 상태 객체 */
const gameState = {
  nickname: '',
  category: '',
  difficulty: '',
  questions: [],
  currentIndex: 0,
  score: 0,
  hintUsed: false,
  questionStartTime: 0,
  answersLog: [],
};

/** 타이머 인스턴스 */
const quizTimer = new QuizTimer();

// ──────────────────────────────────────────
// 화면 전환
// ──────────────────────────────────────────

/**
 * 지정한 id의 섹션만 표시하고 나머지는 숨깁니다.
 * @param {string} id - 표시할 섹션의 id
 */
function showScreen(id) {
  const screens = document.querySelectorAll('section[id^="screen-"]');
  screens.forEach((screen) => {
    if (screen.id === id) {
      screen.hidden = false;
      requestAnimationFrame(() => {
        screen.classList.add('active');
      });
    } else {
      screen.classList.remove('active');
      screen.hidden = true;
    }
  });
}

// ──────────────────────────────────────────
// 시작 화면
// ──────────────────────────────────────────

function initStartScreen() {
  const startBtn = document.getElementById('btn-start');
  const nicknameInput = document.getElementById('input-nickname');
  const categoryBtns = document.querySelectorAll('.btn-category');
  const leaderboardBtn = document.getElementById('btn-leaderboard');

  categoryBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const nickname = nicknameInput.value.trim();
      if (!nickname) {
        nicknameInput.focus();
        nicknameInput.classList.add('input-error');
        showToast('닉네임을 입력해 주세요.');
        return;
      }
      nicknameInput.classList.remove('input-error');
      gameState.nickname = nickname;
      gameState.category = btn.dataset.category;

      const selectedCategoryEl = document.getElementById('selected-category');
      if (selectedCategoryEl) {
        selectedCategoryEl.textContent = gameState.category;
      }
      showScreen('screen-difficulty');
    });
  });

  nicknameInput.addEventListener('input', () => {
    nicknameInput.classList.remove('input-error');
  });

  startBtn.addEventListener('click', () => {
    const nickname = nicknameInput.value.trim();
    if (!nickname) {
      nicknameInput.focus();
      nicknameInput.classList.add('input-error');
      showToast('닉네임을 입력해 주세요.');
      return;
    }
    nicknameInput.classList.remove('input-error');
    showToast('카테고리를 선택해 주세요.');
  });

  leaderboardBtn.addEventListener('click', () => {
    renderLeaderboardScreen();
    showScreen('screen-leaderboard');
  });
}

// ──────────────────────────────────────────
// 난이도 선택 화면
// ──────────────────────────────────────────

function initDifficultyScreen() {
  const difficultyBtns = document.querySelectorAll('.btn-difficulty');
  const backBtn = document.getElementById('btn-back-to-start');

  difficultyBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      gameState.difficulty = btn.dataset.difficulty;
      startQuiz();
    });
  });

  backBtn.addEventListener('click', () => {
    showScreen('screen-start');
  });
}

// ──────────────────────────────────────────
// 리더보드 화면
// ──────────────────────────────────────────

function initLeaderboardScreen() {
  document.getElementById('btn-leaderboard-back').addEventListener('click', () => {
    showScreen('screen-start');
  });
}

/**
 * 리더보드 화면 내용을 렌더링합니다.
 */
function renderLeaderboardScreen() {
  const container = document.getElementById('leaderboard-container');
  container.innerHTML = '';

  const categories = ['전체', '한국사', '과학', '지리', '일반상식'];
  let activeCategory = '전체';

  const tabsEl = document.createElement('div');
  tabsEl.className = 'lb-tabs';

  const tableEl = document.createElement('div');
  tableEl.className = 'lb-table';

  function renderTable(cat) {
    const entries = getTopEntries(10, cat === '전체' ? null : cat);
    tableEl.innerHTML = '';

    if (entries.length === 0) {
      const emptyEl = document.createElement('p');
      emptyEl.className = 'lb-empty';
      emptyEl.textContent = '아직 기록이 없습니다.';
      tableEl.appendChild(emptyEl);
      return;
    }

    entries.forEach((entry, i) => {
      const row = document.createElement('div');
      row.className = 'lb-row' + (i < 3 ? ` lb-row-top-${i + 1}` : '');

      const rankEl = document.createElement('span');
      rankEl.className = 'lb-rank';
      rankEl.textContent = i + 1;

      const nameEl = document.createElement('span');
      nameEl.className = 'lb-nickname';
      nameEl.textContent = entry.nickname;

      const scoreEl = document.createElement('span');
      scoreEl.className = 'lb-score';
      scoreEl.textContent = `${entry.score}점`;

      const metaEl = document.createElement('span');
      metaEl.className = 'lb-meta';
      metaEl.textContent = `${entry.category} · ${entry.difficulty}`;

      row.appendChild(rankEl);
      row.appendChild(nameEl);
      row.appendChild(scoreEl);
      row.appendChild(metaEl);
      tableEl.appendChild(row);
    });
  }

  categories.forEach((cat) => {
    const tab = document.createElement('button');
    tab.className = 'lb-tab' + (cat === activeCategory ? ' lb-tab-active' : '');
    tab.textContent = cat;
    tab.addEventListener('click', () => {
      activeCategory = cat;
      tabsEl.querySelectorAll('.lb-tab').forEach((t) => t.classList.remove('lb-tab-active'));
      tab.classList.add('lb-tab-active');
      renderTable(cat);
    });
    tabsEl.appendChild(tab);
  });

  container.appendChild(tabsEl);
  container.appendChild(tableEl);
  renderTable('전체');
}

// ──────────────────────────────────────────
// 퀴즈 진행
// ──────────────────────────────────────────

/**
 * 문제를 로드·필터링·셔플하여 퀴즈를 시작합니다.
 */
async function startQuiz() {
  try {
    const allQuestions = await loadQuestions();
    const filtered = filterQuestions(allQuestions, gameState.category, gameState.difficulty);

    if (filtered.length === 0) {
      showToast('해당 카테고리/난이도의 문제가 없습니다.');
      return;
    }

    gameState.questions = prepareQuestions(filtered);
    gameState.currentIndex = 0;
    gameState.score = 0;
    gameState.answersLog = [];

    showScreen('screen-quiz');
    renderQuestion(0);
  } catch (e) {
    console.error(e);
    showToast('문제를 불러오는 데 실패했습니다.');
  }
}

/**
 * 지정 인덱스의 문제를 화면에 렌더링하고 타이머를 시작합니다.
 * @param {number} index
 */
function renderQuestion(index) {
  const q = gameState.questions[index];
  const total = gameState.questions.length;

  // 진행 상황
  document.getElementById('quiz-current').textContent = index + 1;
  document.getElementById('quiz-total').textContent = total;

  // 상태 표시
  document.getElementById('quiz-category-display').textContent = gameState.category;
  document.getElementById('quiz-difficulty-display').textContent = gameState.difficulty;
  document.getElementById('quiz-score-display').textContent = gameState.score;

  // 문제 텍스트
  document.getElementById('quiz-question').textContent = q.question;

  // 보기 버튼 생성
  const optionsEl = document.getElementById('quiz-options');
  optionsEl.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'btn-option';
    btn.textContent = `${i + 1}. ${opt}`;
    btn.dataset.index = i;
    btn.addEventListener('click', () => selectOption(i));
    optionsEl.appendChild(btn);
  });

  // 힌트 초기화
  gameState.hintUsed = false;
  const hintBtn = document.getElementById('btn-hint');
  hintBtn.disabled = false;
  hintBtn.classList.remove('hint-used');
  const hintTextEl = document.getElementById('hint-text');
  hintTextEl.hidden = true;
  hintTextEl.textContent = '';

  // 피드백 숨김
  document.getElementById('quiz-feedback').hidden = true;

  // 마지막 문제 여부에 따라 버튼 텍스트 변경
  document.getElementById('btn-next').textContent =
    index + 1 < total ? '다음 문제 →' : '결과 보기 →';

  // 시작 시간 기록
  gameState.questionStartTime = Date.now();

  // 타이머 시작
  quizTimer.start(20, onTimerTick, handleTimeout);
}

/**
 * 타이머 틱마다 타이머 바를 업데이트합니다.
 * @param {number} remaining - 남은 초
 * @param {number} total - 전체 초
 */
function onTimerTick(remaining, total) {
  const bar = document.getElementById('timer-bar');

  if (remaining === total) {
    // 문제 전환 시 애니메이션 없이 즉시 100% 복원
    bar.style.transition = 'none';
    bar.style.width = '100%';
    bar.style.backgroundColor = '#34d399';
    requestAnimationFrame(() => {
      bar.style.transition = 'width 1s linear, background-color 0.5s ease';
    });
    return;
  }

  const pct = (remaining / total) * 100;
  bar.style.width = pct + '%';

  if (remaining > 10) {
    bar.style.backgroundColor = '#34d399'; // 초록
  } else if (remaining > 5) {
    bar.style.backgroundColor = '#ffc832'; // 노랑
  } else {
    bar.style.backgroundColor = '#ef4444'; // 빨강
  }
}

/**
 * 타임오버 처리 — 오답으로 처리하고 정답을 표시합니다.
 */
function handleTimeout() {
  const q = gameState.questions[gameState.currentIndex];

  // 모든 보기 비활성화 + 정답 하이라이트
  const buttons = document.querySelectorAll('.btn-option');
  buttons.forEach((btn) => (btn.disabled = true));
  if (buttons[q.answer]) {
    buttons[q.answer].classList.add('option-correct');
  }

  // 오답으로 기록
  gameState.answersLog.push({
    question: q,
    selectedIndex: -1,
    isCorrect: false,
    hintUsed: gameState.hintUsed,
    timedOut: true,
  });

  showFeedback(false, q.explanation, true);
}

/**
 * 보기 선택 처리 — 정오답 판정, 점수 계산, 피드백 표시
 * @param {number} selectedIndex - 선택한 보기 인덱스
 */
function selectOption(selectedIndex) {
  quizTimer.stop();

  const q = gameState.questions[gameState.currentIndex];
  const elapsed = (Date.now() - gameState.questionStartTime) / 1000;
  const isCorrect = selectedIndex === q.answer;

  // 모든 보기 즉시 비활성화
  const buttons = document.querySelectorAll('.btn-option');
  buttons.forEach((btn) => (btn.disabled = true));

  // 정오답 하이라이트
  buttons[selectedIndex].classList.add(isCorrect ? 'option-correct' : 'option-wrong');
  if (!isCorrect) {
    buttons[q.answer].classList.add('option-correct');
  }

  // 점수 계산 및 반영
  if (isCorrect) {
    const earned = calculateScore(gameState.difficulty, elapsed, gameState.hintUsed);
    gameState.score += earned;
    document.getElementById('quiz-score-display').textContent = gameState.score;
  }

  // 답 기록
  gameState.answersLog.push({
    question: q,
    selectedIndex,
    isCorrect,
    hintUsed: gameState.hintUsed,
  });

  showFeedback(isCorrect, q.explanation, false);
}

/**
 * 정오답 / 타임오버 피드백을 화면에 표시합니다.
 * @param {boolean} isCorrect
 * @param {string} explanation
 * @param {boolean} timedOut
 */
function showFeedback(isCorrect, explanation, timedOut = false) {
  const feedbackEl = document.getElementById('quiz-feedback');
  const msgEl = document.getElementById('feedback-message');
  const expEl = document.getElementById('feedback-explanation');

  if (timedOut) {
    msgEl.textContent = '시간 초과! ⏱';
    msgEl.className = 'feedback-message feedback-wrong';
  } else {
    msgEl.textContent = isCorrect ? '정답입니다! 🎉' : '오답입니다.';
    msgEl.className = 'feedback-message ' + (isCorrect ? 'feedback-correct' : 'feedback-wrong');
  }

  if (isCorrect) {
    expEl.hidden = true;
    expEl.textContent = '';
  } else {
    expEl.textContent = explanation;
    expEl.hidden = false;
  }

  feedbackEl.hidden = false;
}

/**
 * 다음 문제로 이동하거나, 문제가 끝나면 결과 화면으로 전환합니다.
 */
function nextQuestion() {
  gameState.currentIndex++;
  if (gameState.currentIndex >= gameState.questions.length) {
    endQuiz();
    return;
  }
  renderQuestion(gameState.currentIndex);
}

/**
 * 게임 종료 처리 — 리더보드 저장 후 결과 화면 렌더링
 */
function endQuiz() {
  const entry = {
    nickname: gameState.nickname,
    score: gameState.score,
    date: new Date().toISOString(),
    category: gameState.category,
    difficulty: gameState.difficulty,
  };
  saveEntry(entry);

  const correctCount = gameState.answersLog.filter((a) => a.isCorrect).length;
  const total = gameState.questions.length;
  const base = BASE_SCORES[gameState.difficulty] ?? 0;
  const maxScore = (base + 5) * total;
  const pct = maxScore > 0 ? Math.round((gameState.score / maxScore) * 100) : 0;

  // 카테고리별 정답 집계
  const catStats = {};
  gameState.answersLog.forEach((log) => {
    const cat = log.question.category;
    if (!catStats[cat]) catStats[cat] = { correct: 0, total: 0 };
    catStats[cat].total++;
    if (log.isCorrect) catStats[cat].correct++;
  });

  const rank = getRank(entry);

  showScreen('screen-result');
  renderResultScreen({ entry, correctCount, total, maxScore, pct, catStats, rank });
}

/**
 * 결과 화면을 DOM으로 구성합니다. (XSS 방지를 위해 textContent 사용)
 */
function renderResultScreen({ entry, correctCount, total, maxScore, pct, catStats, rank }) {
  const container = document.getElementById('result-container');
  container.innerHTML = '';

  // ── 최종 점수
  const scoreEl = document.createElement('h2');
  scoreEl.className = 'result-score';
  scoreEl.textContent = entry.score;
  const unitEl = document.createElement('span');
  unitEl.className = 'result-score-unit';
  unitEl.textContent = '점';
  scoreEl.appendChild(unitEl);

  // ── 닉네임
  const nicknameEl = document.createElement('p');
  nicknameEl.className = 'result-nickname';
  nicknameEl.textContent = `${entry.nickname}님의 최종 점수`;

  // ── 만점 대비 비율
  const ratioEl = document.createElement('p');
  ratioEl.className = 'result-ratio';
  ratioEl.textContent = `${entry.score}점 / ${maxScore}점 (${pct}%)`;

  // ── 정답 수
  const statsEl = document.createElement('p');
  statsEl.className = 'result-stats';
  statsEl.textContent = `${total}문제 중 ${correctCount}개 정답`;

  // ── 카테고리별 정답 수
  const catEl = document.createElement('div');
  catEl.className = 'result-cat-stats';
  Object.entries(catStats).forEach(([cat, stat]) => {
    const row = document.createElement('div');
    row.className = 'result-cat-row';
    const label = document.createElement('span');
    label.className = 'result-cat-label';
    label.textContent = cat;
    const val = document.createElement('span');
    val.className = 'result-cat-val';
    val.textContent = `${stat.correct} / ${stat.total}`;
    row.appendChild(label);
    row.appendChild(val);
    catEl.appendChild(row);
  });

  // ── 순위
  const rankEl = document.createElement('p');
  rankEl.className = 'result-rank';
  rankEl.textContent = rank ? `🏆 전체 순위 ${rank}위` : '';

  // ── 버튼 3개
  const actionsEl = document.createElement('div');
  actionsEl.className = 'result-actions';

  const retryBtn = document.createElement('button');
  retryBtn.className = 'btn btn-primary btn-block';
  retryBtn.textContent = '재도전';
  retryBtn.addEventListener('click', () => startQuiz());

  const changeBtn = document.createElement('button');
  changeBtn.className = 'btn btn-secondary btn-block';
  changeBtn.textContent = '카테고리 변경';
  changeBtn.addEventListener('click', () => showScreen('screen-start'));

  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn btn-secondary btn-block';
  closeBtn.textContent = '종료';
  closeBtn.addEventListener('click', () => {
    // 탭 닫기 시도, 실패하면 시작 화면으로
    try { window.close(); } catch (e) { /* ignore */ }
    showScreen('screen-start');
  });

  actionsEl.appendChild(retryBtn);
  actionsEl.appendChild(changeBtn);
  actionsEl.appendChild(closeBtn);

  container.appendChild(scoreEl);
  container.appendChild(nicknameEl);
  container.appendChild(ratioEl);
  container.appendChild(statsEl);
  if (Object.keys(catStats).length > 0) container.appendChild(catEl);
  if (rank) container.appendChild(rankEl);
  container.appendChild(actionsEl);
}

// ──────────────────────────────────────────
// 퀴즈 화면 이벤트 바인딩
// ──────────────────────────────────────────

function initQuizScreen() {
  document.getElementById('btn-hint').addEventListener('click', () => {
    if (gameState.hintUsed) return;
    const q = gameState.questions[gameState.currentIndex];
    gameState.hintUsed = true;

    const hintBtn = document.getElementById('btn-hint');
    hintBtn.disabled = true;
    hintBtn.classList.add('hint-used');

    const hintTextEl = document.getElementById('hint-text');
    hintTextEl.textContent = `💡 ${q.hint}  ※ 힌트 사용 시 점수 50% 적용`;
    hintTextEl.hidden = false;
  });

  document.getElementById('btn-next').addEventListener('click', nextQuestion);
}

// ──────────────────────────────────────────
// 키보드 단축키 (1~4 보기 선택)
// ──────────────────────────────────────────

function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const activeScreen = document.querySelector('section[id^="screen-"].active');
    if (!activeScreen || activeScreen.id !== 'screen-quiz') return;
    if (!['1', '2', '3', '4'].includes(e.key)) return;

    // 피드백 표시 중에는 키 입력 무시
    const feedbackVisible = !document.getElementById('quiz-feedback').hidden;
    if (feedbackVisible) return;

    const idx = parseInt(e.key, 10) - 1;
    const buttons = document.querySelectorAll('.btn-option');
    if (buttons[idx] && !buttons[idx].disabled) {
      selectOption(idx);
    }
  });
}

// ──────────────────────────────────────────
// 토스트 메시지
// ──────────────────────────────────────────

function showToast(message) {
  const existingToast = document.getElementById('toast-message');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.id = 'toast-message';
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });

  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// ──────────────────────────────────────────
// 앱 초기화
// ──────────────────────────────────────────

function initApp() {
  initStartScreen();
  initDifficultyScreen();
  initQuizScreen();
  initLeaderboardScreen();
  initKeyboardShortcuts();
  showScreen('screen-start');
  console.log('상식 퀴즈 게임이 초기화되었습니다.');
}

document.addEventListener('DOMContentLoaded', initApp);
