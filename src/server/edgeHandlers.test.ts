import { describe, expect, it } from "vitest";
import {
  coachTurnWithProvider,
  generateWeekWithProvider,
  gradeAttemptWithProvider,
  refreshProgressMetrics,
  summarizeLessonWithProvider
} from "./functionHandlers";
import { createSeedWeekPack } from "../domain/testFixtures";

describe("mocked Edge Function handlers", () => {
  it("uses validated provider output for generate_week", async () => {
    const seed = createSeedWeekPack();
    const result = await generateWeekWithProvider(
      { userId: "user-1", targetWeekStartDate: "2026-05-18", difficulty: 1 },
      async () => ({ ok: true, value: seed })
    );
    expect(result.source).toBe("llm");
    expect(result.weekPack.id).toBe(seed.id);
    expect(result.weekPack.prepGuide.quickChecks).toHaveLength(3);
  });

  it("falls back when generate_week provider output is invalid", async () => {
    const result = await generateWeekWithProvider(
      { userId: "user-1", targetWeekStartDate: "2026-05-18", difficulty: 1 },
      async () => ({ ok: false, error: "schema failed" })
    );
    expect(result.source).toBe("fallback");
    expect(result.weekPack.weekdayProblems).toHaveLength(5);
    expect(result.weekPack.prepGuide.sections.length).toBeGreaterThanOrEqual(3);
  });

  it("falls back when generate_week provider omits prep guide", async () => {
    const invalid = createSeedWeekPack() as unknown as Record<string, unknown>;
    delete invalid.prepGuide;

    const result = await generateWeekWithProvider(
      { userId: "user-1", targetWeekStartDate: "2026-05-18", difficulty: 1 },
      async () => ({ ok: true, value: invalid as never })
    );

    expect(result.source).toBe("fallback");
    expect(result.weekPack.prepGuide.dayCoverage.monday).toBeDefined();
  });

  it("falls back for coach, grade, and lesson providers", async () => {
    const coach = await coachTurnWithProvider(async () => ({ ok: false, error: "offline" }));
    const grade = await gradeAttemptWithProvider(async () => ({ ok: false, error: "offline" }));
    const lessons = await summarizeLessonWithProvider(async () => ({ ok: false, error: "offline" }));

    expect(coach.source).toBe("fallback");
    expect(coach.message).toContain("frame");
    expect(grade.source).toBe("fallback");
    expect(grade.score.correctness).toBeGreaterThanOrEqual(0);
    expect(lessons.source).toBe("fallback");
    expect(lessons.lessons[0].revisitPrompt).toContain("Revisit");
  });

  it("refreshes progress metrics with next difficulty and concept lists", () => {
    const result = refreshProgressMetrics(2, {
      hintRate: 0.12,
      completionRate: 1,
      avgCorrectness: 0.86,
      avgReasoning: 0.81,
      avgTimeRatio: 0.95,
      weakConcepts: ["calibration"],
      masteredConcepts: ["expected value"]
    });
    expect(result.difficultyAfter).toBe(2.25);
    expect(result.weakConcepts).toEqual(["calibration"]);
    expect(result.masteredConcepts).toEqual(["expected value"]);
  });
});
