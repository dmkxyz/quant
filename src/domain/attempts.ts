import type { Attempt, CoachTurn, Problem, ProblemStage } from "./contracts";

export function createAttempt(userId: string, problem: Problem, now = new Date()): Attempt {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `attempt-${problem.id}-${now.getTime()}`,
    userId,
    problemId: problem.id,
    startedAt: now.toISOString(),
    elapsedSeconds: 0,
    hintsUsed: 0,
    stageProgress: problem.stages.map((stage) => ({
      stageId: stage.id,
      answer: "",
      hintsUsed: 0,
      coachTurns: []
    })),
    selfConfidence: 3,
    submittedAnswer: ""
  };
}

export function requestHint(
  attempt: Attempt,
  stage: ProblemStage,
  now = new Date()
): { attempt: Attempt; hint: string; hintLevel: number } {
  const maxHints = stage.hints.length;
  const stageIndex = attempt.stageProgress.findIndex((progress) => progress.stageId === stage.id);
  if (stageIndex === -1) {
    throw new Error(`Cannot request hint for unknown stage ${stage.id}`);
  }

  const currentStage = attempt.stageProgress[stageIndex];
  const nextLevel = Math.min(currentStage.hintsUsed + 1, maxHints);
  const shouldIncrement = currentStage.hintsUsed < maxHints;
  const hint = stage.hints[nextLevel - 1] ?? stage.hints[maxHints - 1] ?? "Reframe the problem from first principles.";

  const coachTurn: CoachTurn = {
    role: "coach",
    message: hint,
    createdAt: now.toISOString(),
    kind: "hint_request"
  };

  const stageProgress = attempt.stageProgress.map((progress, index) =>
    index === stageIndex
      ? {
          ...progress,
          hintsUsed: shouldIncrement ? nextLevel : progress.hintsUsed,
          coachTurns: [...progress.coachTurns, coachTurn]
        }
      : progress
  );

  return {
    hint,
    hintLevel: nextLevel,
    attempt: {
      ...attempt,
      hintsUsed: shouldIncrement ? attempt.hintsUsed + 1 : attempt.hintsUsed,
      stageProgress
    }
  };
}

export function recordStageAnswer(
  attempt: Attempt,
  stageId: string,
  answer: string,
  coachTurn?: CoachTurn,
  now = new Date()
): Attempt {
  const answerTurn: CoachTurn = {
    role: "user",
    message: answer,
    createdAt: now.toISOString(),
    kind: "answer"
  };

  return {
    ...attempt,
    stageProgress: attempt.stageProgress.map((progress) =>
      progress.stageId === stageId
        ? {
            ...progress,
            answer,
            completedAt: now.toISOString(),
            coachTurns: coachTurn
              ? [...progress.coachTurns, answerTurn, coachTurn]
              : [...progress.coachTurns, answerTurn]
          }
        : progress
    )
  };
}

export function submitAttempt(
  attempt: Attempt,
  submittedAnswer: string,
  selfConfidence: 1 | 2 | 3 | 4 | 5,
  elapsedSeconds: number,
  now = new Date()
): Attempt {
  return {
    ...attempt,
    submittedAt: now.toISOString(),
    elapsedSeconds,
    selfConfidence,
    submittedAnswer
  };
}
