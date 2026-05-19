import { describe, expect, it } from "vitest";
import { createAttempt, recordStageAnswer, requestHint, submitAttempt } from "./attempts";
import { createSeedWeekPack } from "./testFixtures";

describe("attempt state and hint accounting", () => {
  const problem = createSeedWeekPack().weekdayProblems[0];

  it("creates stage progress for every problem stage", () => {
    const attempt = createAttempt("user-1", problem, new Date("2026-05-18T09:00:00Z"));
    expect(attempt.userId).toBe("user-1");
    expect(attempt.problemId).toBe(problem.id);
    expect(attempt.stageProgress.map((stage) => stage.stageId)).toEqual(problem.stages.map((stage) => stage.id));
    expect(attempt.hintsUsed).toBe(0);
  });

  it("tracks graduated hints and never exceeds available hint slots", () => {
    let attempt = createAttempt("user-1", problem);
    const stage = problem.stages[0];
    const first = requestHint(attempt, stage);
    attempt = first.attempt;
    const second = requestHint(attempt, stage);
    attempt = second.attempt;
    const third = requestHint(attempt, stage);
    attempt = third.attempt;
    const fourth = requestHint(attempt, stage);

    expect(first.hintLevel).toBe(1);
    expect(second.hintLevel).toBe(2);
    expect(third.hintLevel).toBe(3);
    expect(fourth.hintLevel).toBe(3);
    expect(fourth.attempt.hintsUsed).toBe(3);
  });

  it("records answers and submits a completed attempt", () => {
    const attempt = createAttempt("user-1", problem, new Date("2026-05-18T09:00:00Z"));
    const answered = recordStageAnswer(
      attempt,
      problem.stages[0].id,
      "The fair starting price is around 0.5 because symmetry sets the base rate.",
      {
        role: "coach",
        message: "Good symmetry anchor. Now test the conditioning step.",
        createdAt: "2026-05-18T09:02:00.000Z",
        kind: "coach_feedback"
      },
      new Date("2026-05-18T09:02:00Z")
    );
    const submitted = submitAttempt(
      answered,
      "I would price the game at 0.5, then widen the market for uncertainty.",
      4,
      780,
      new Date("2026-05-18T09:13:00Z")
    );

    expect(answered.stageProgress[0].answer).toContain("symmetry");
    expect(answered.stageProgress[0].completedAt).toBe("2026-05-18T09:02:00.000Z");
    expect(submitted.submittedAt).toBe("2026-05-18T09:13:00.000Z");
    expect(submitted.selfConfidence).toBe(4);
    expect(submitted.elapsedSeconds).toBe(780);
  });
});
