/**
 * data.js
 * questions.json을 fetch로 로드하고 필터링하는 모듈
 */

/**
 * 전체 문제 배열을 로드합니다.
 * @returns {Promise<Array>} 문제 배열을 resolve하는 Promise
 */
async function loadQuestions() {
  try {
    const response = await fetch('./data/questions.json');
    if (!response.ok) {
      throw new Error(`questions.json 로드 실패: HTTP ${response.status}`);
    }
    const questions = await response.json();
    return questions;
  } catch (error) {
    console.error('문제 데이터를 불러오는 중 오류가 발생했습니다:', error);
    throw error;
  }
}

/**
 * 카테고리와 난이도로 문제를 필터링합니다.
 * @param {Array} questions - 전체 문제 배열
 * @param {string} category - 카테고리 ("전체", "한국사", "과학", "지리", "일반상식")
 * @param {string} difficulty - 난이도 ("초급", "중급", "고급")
 * @returns {Array} 필터링된 문제 배열
 */
function filterQuestions(questions, category, difficulty) {
  return questions.filter((q) => {
    const categoryMatch = category === '전체' || q.category === category;
    const difficultyMatch = q.difficulty === difficulty;
    return categoryMatch && difficultyMatch;
  });
}
