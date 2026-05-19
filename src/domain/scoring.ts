import type { Attempt, AttemptScore, LessonBite, Problem, WeeklyMetrics } from "./contracts";

export function scoreAttemptLocally(attempt: Attempt, problem: Problem, now = new Date()): AttemptScore {
  const answeredStages = attempt.stageProgress.filter((stage) => stage.answer.trim().length > 0).length;
  const stageCoverage = answeredStages / Math.max(1, problem.stages.length);
  const hintPenalty = Math.min(0.22, attempt.hintsUsed * 0.04);
  const answerQuality = Math.min(1, attempt.submittedAnswer.trim().length / 260);
  const confidenceCalibration = 1 - Math.abs(attempt.selfConfidence - Math.round(1 + answerQuality * 4)) / 4;

  const correctness = clamp01(0.42 + stageCoverage * 0.28 + answerQuality * 0.22 - hintPenalty);
  const reasoningQuality = clamp01(0.38 + stageCoverage * 0.3 + answerQuality * 0.25 - hintPenalty / 2);
  const communicationQuality = clamp01(0.45 + Math.min(0.25, attempt.submittedAnswer.split(/\s+/).length / 140));
  const calibration = clamp01(0.48 + confidenceCalibration * 0.28 - hintPenalty / 2);

  const conceptScores = Object.fromEntries(
    problem.concepts.map((concept, index) => [
      concept,
      clamp01((correctness + reasoningQuality + calibration) / 3 - index * 0.015)
    ])
  );

  return {
    id: `score-${attempt.id}`,
    attemptId: attempt.id,
    correctness,
    reasoningQuality,
    communicationQuality,
    calibration,
    conceptScores,
    strengths: [
      answeredStages === problem.stages.length
        ? "You worked through every stage instead of jumping straight to a final number."
        : "You started the reasoning path; finish each stage to improve signal quality.",
      "Your confidence rating gives the coach calibration data for the next drill."
    ],
    mistakes:
      attempt.hintsUsed > 1
        ? ["You leaned on multiple hints; next time write the state space before asking for the method."]
        : ["Keep checking whether new information changes the sample space or only the spread."],
    nextStepRecommendation: "Redo the update stage in one concise paragraph, then quote a wider and a tighter market.",
    createdAt: now.toISOString()
  };
}

export function createLessonFromScore(
  score: AttemptScore,
  problem: Problem,
  userId: string,
  now = new Date()
): LessonBite {
  const weakestConcept = Object.entries(score.conceptScores).sort((a, b) => a[1] - b[1])[0]?.[0] ?? problem.concepts[0];
  const masteryStatus: LessonBite["masteryStatus"] =
    score.conceptScores[weakestConcept] >= 0.82 ? "mastered" : score.conceptScores[weakestConcept] < 0.65 ? "weak" : "practicing";

  return {
    id: `lesson-${score.attemptId}-${weakestConcept.replace(/\s+/g, "-")}`,
    userId,
    sourceProblemId: problem.id,
    sourceWeekId: problem.weekId,
    concept: weakestConcept,
    explanation: `For ${weakestConcept}, separate the estimate from the confidence around it. A good answer names the base case, then explains the update.`,
    example: "If a signal removes losing states, the midpoint can move up; if it only increases uncertainty, the spread widens without moving the midpoint much.",
    commonTrap: "Blending a probability update and a confidence update into one unsupported final number.",
    revisitPrompt: `Revisit ${problem.title}: write the base rate, one update equation, and a bid/ask quote.`,
    masteryStatus,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}

export function computeWeeklyMetrics(args: {
  problems: Problem[];
  attempts: Attempt[];
  scores: AttemptScore[];
}): WeeklyMetrics {
  const assignedProblems = Math.max(1, args.problems.length);
  const completedAttempts = args.attempts.filter((attempt) => Boolean(attempt.submittedAt));
  const totalHintsUsed = completedAttempts.reduce((sum, attempt) => sum + attempt.hintsUsed, 0);
  const totalAvailableHints = args.problems.reduce(
    (sum, problem) => sum + problem.stages.reduce((stageSum, stage) => stageSum + stage.hints.length, 0),
    0
  );

  const conceptScores: Record<string, number[]> = {};
  for (const score of args.scores) {
    for (const [concept, value] of Object.entries(score.conceptScores)) {
      conceptScores[concept] = [...(conceptScores[concept] ?? []), value];
    }
  }

  return {
    hintRate: totalHintsUsed / Math.max(1, totalAvailableHints),
    completionRate: completedAttempts.length / assignedProblems,
    avgCorrectness: mean(args.scores.map((score) => score.correctness)),
    avgReasoning: mean(args.scores.map((score) => score.reasoningQuality)),
    avgTimeRatio: mean(
      completedAttempts.map((attempt) => {
        const problem = args.problems.find((item) => item.id === attempt.problemId);
        return attempt.elapsedSeconds / 60 / Math.max(1, problem?.estimatedMinutes ?? 20);
      })
    ),
    weakConcepts: Object.entries(conceptScores)
      .filter(([, values]) => mean(values) < 0.65)
      .map(([concept]) => concept),
    masteredConcepts: Object.entries(conceptScores)
      .filter(([, values]) => values.length >= 2 && mean(values) >= 0.82)
      .map(([concept]) => concept)
  };
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number(value.toFixed(2))));
}
