/**
 * leaderboard.js
 * LocalStorage 기반 리더보드 저장 / 조회
 */

const LEADERBOARD_KEY = 'quiz_leaderboard';

/**
 * LocalStorage에서 전체 기록을 로드합니다.
 * @returns {Array} 기록 배열
 */
function getEntries() {
  try {
    return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || [];
  } catch {
    return [];
  }
}

/**
 * 새 기록을 저장합니다.
 * @param {{ nickname: string, score: number, date: string, category: string, difficulty: string }} entry
 */
function saveEntry(entry) {
  const entries = getEntries();
  entries.push(entry);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
}

/**
 * 기록을 점수 내림차순, 동점 시 최신 날짜 우선으로 정렬합니다.
 * @param {Array} entries
 * @returns {Array} 정렬된 새 배열
 */
function _sortEntries(entries) {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.date) - new Date(a.date);
  });
}

/**
 * 상위 n개 기록을 반환합니다.
 * @param {number} n - 최대 반환 수
 * @param {string|null} category - 카테고리 필터 (null이면 전체)
 * @returns {Array}
 */
function getTopEntries(n = 10, category = null) {
  let entries = getEntries();
  if (category) {
    entries = entries.filter((e) => e.category === category);
  }
  return _sortEntries(entries).slice(0, n);
}

/**
 * 특정 기록의 전체 순위(1-indexed)를 반환합니다.
 * @param {{ nickname: string, score: number, date: string }} entry
 * @returns {number|null}
 */
function getRank(entry) {
  const sorted = _sortEntries(getEntries());
  const idx = sorted.findIndex(
    (e) => e.nickname === entry.nickname && e.score === entry.score && e.date === entry.date
  );
  return idx === -1 ? null : idx + 1;
}
