export const applyActivityScore = (
  currentScore: number,
  correct: boolean,
  points: number,
  negativeMarks: number,
) => currentScore + (correct ? (Number(points) || 0) : -(Math.max(0, Number(negativeMarks) || 0)));
