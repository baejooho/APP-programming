/**
 * score.js
 * 점수 계산 순수 함수 모음 — 상태를 직접 변경하지 않음
 */

const BASE_SCORES = { '초급': 5, '중급': 10, '고급': 15 };

/**
 * 정답 시 획득 점수를 계산합니다.
 * @param {string} difficulty - '초급' | '중급' | '고급'
 * @param {number} elapsedSeconds - 문제 시작 후 경과 시간(초)
 * @param {boolean} hintUsed - 힌트 사용 여부
 * @returns {number} 획득 점수
 */
function calculateScore(difficulty, elapsedSeconds, hintUsed) {
  const base = BASE_SCORES[difficulty] ?? 0;

  // 힌트 사용 시 기본 점수 × 0.5 (시간 보너스 없음)
  if (hintUsed) {
    return Math.floor(base * 0.5);
  }

  let score = base;

  // 7초 이내 정답 보너스
  if (elapsedSeconds <= 7) {
    score += 5;
  }

  return score;
}
