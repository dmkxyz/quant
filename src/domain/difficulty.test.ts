import { describe, expect, it } from "vitest";
import { calculateNextDifficulty, clampDifficulty, labelForDifficulty } from "./difficulty";
import type { WeeklyMetrics } from "./contracts";

const strongWeek: WeeklyMetrics = {
  hintRate: 0.18,
  completionRate: 0.9,
  avgCorrectness: 0.82,
  avgReasoning: 0.79,
  avgTimeRatio: 1.05,
  weakConcepts: [],
  masteredConcepts: ["expected value"]
};

describe("adaptive difficulty", () => {
  it("raises difficulty on low hint use and high scores", () => {
    expect(calculateNextDifficulty(2, strongWeek)).toBe(2.25);
  });

  it("lowers difficulty on high hint use or weak scores", () => {
    expect(
      calculateNextDifficulty(2, {
        ...strongWeek,
        hintRate: 0.6,
        avgCorrectness: 0.7
      })
    ).toBe(1.75);
    expect(
      calculateNextDifficulty(2, {
        ...strongWeek,
        hintRate: 0.2,
        avgCorrectness: 0.5
      })
    ).toBe(1.75);
  });

  it("keeps difficulty stable for mixed performance", () => {
    expect(
      calculateNextDifficulty(2, {
        ...strongWeek,
        hintRate: 0.34,
        avgCorrectness: 0.72
      })
    ).toBe(2);
  });

  it("respects 0.5 to 5.0 bounds and labels values", () => {
    expect(clampDifficulty(0)).toBe(0.5);
    expect(clampDifficulty(6)).toBe(5);
    expect(calculateNextDifficulty(5, strongWeek)).toBe(5);
    expect(labelForDifficulty(0.7)).toBe("beginner");
    expect(labelForDifficulty(1.8)).toBe("developing");
    expect(labelForDifficulty(2.8)).toBe("intermediate");
    expect(labelForDifficulty(3.8)).toBe("advanced");
    expect(labelForDifficulty(4.8)).toBe("expert");
  });
});
