import { describe, expect, it } from "vitest";
import { createInitialPrepProgress, markPrepGuideViewed, markPrepQuickCheckComplete } from "./prepProgress";

describe("prep guide progress", () => {
  it("tracks viewed state and completed quick checks without duplicates", () => {
    const now = new Date("2026-05-21T09:30:00.000Z");
    const initial = createInitialPrepProgress("week-1");

    expect(initial.weekPackId).toBe("week-1");
    expect(initial.viewedAt).toBeUndefined();
    expect(initial.completedCheckIds).toEqual([]);

    const viewed = markPrepGuideViewed(initial, now);
    expect(viewed.viewedAt).toBe("2026-05-21T09:30:00.000Z");

    const withCheck = markPrepQuickCheckComplete(viewed, "ev-check");
    const repeated = markPrepQuickCheckComplete(withCheck, "ev-check");

    expect(repeated.completedCheckIds).toEqual(["ev-check"]);
  });
});
