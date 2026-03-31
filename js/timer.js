/**
 * timer.js
 * 문제당 카운트다운 타이머 — 인스턴스 기반
 */

class QuizTimer {
  constructor() {
    this._intervalId = null;
    this._elapsed = 0;
  }

  /**
   * 타이머를 시작합니다. 기존 타이머는 자동 중지됩니다.
   * @param {number} totalSeconds - 총 제한 시간(초)
   * @param {function(remaining: number, total: number): void} onTick - 매 초 호출
   * @param {function(): void} onTimeout - 시간 초과 시 호출
   */
  start(totalSeconds, onTick, onTimeout) {
    this.stop();
    this._elapsed = 0;

    // 즉시 초기 상태 렌더
    onTick(totalSeconds, totalSeconds);

    this._intervalId = setInterval(() => {
      this._elapsed++;
      const remaining = totalSeconds - this._elapsed;
      onTick(remaining, totalSeconds);
      if (remaining <= 0) {
        this.stop();
        onTimeout();
      }
    }, 1000);
  }

  /** 타이머를 정지합니다. */
  stop() {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  /** 현재까지 경과한 초를 반환합니다. */
  getElapsed() {
    return this._elapsed;
  }
}
