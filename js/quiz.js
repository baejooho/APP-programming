/**
 * quiz.js
 * 문제 셔플 및 보기 순서 재계산 모듈
 */

/**
 * Fisher-Yates 알고리즘으로 배열을 랜덤 셔플합니다. (원본 불변)
 * @param {Array} arr
 * @returns {Array} 셔플된 새 배열
 */
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 문제 하나의 보기를 셔플하고 정답 인덱스를 재계산합니다.
 * @param {Object} question - 원본 문제 객체
 * @returns {Object} 보기가 셔플된 새 문제 객체
 */
function shuffleOptions(question) {
  const originalAnswer = question.options[question.answer];
  const shuffledOptions = shuffleArray(question.options);
  return {
    ...question,
    options: shuffledOptions,
    answer: shuffledOptions.indexOf(originalAnswer),
  };
}

/**
 * 문제 배열을 셔플하고 각 문제의 보기도 셔플합니다.
 * @param {Array} questions - 필터링된 문제 배열
 * @returns {Array} 출제 준비된 문제 배열
 */
function prepareQuestions(questions) {
  return shuffleArray(questions).map(shuffleOptions);
}
