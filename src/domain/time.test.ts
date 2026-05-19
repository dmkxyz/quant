import { describe, expect, it } from "vitest";
import { isoDate, mondayForDate } from "./time";

describe("training calendar dates", () => {
  it("serializes local calendar dates without UTC day drift", () => {
    expect(isoDate(new Date(2026, 4, 18, 0, 0, 0))).toBe("2026-05-18");
  });

  it("treats Monday as the first training day", () => {
    expect(isoDate(mondayForDate(new Date(2026, 4, 19, 12, 0, 0)))).toBe("2026-05-18");
  });
});
