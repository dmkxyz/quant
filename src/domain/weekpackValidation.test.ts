import { describe, expect, it } from "vitest";
import { validateWeekPack } from "./schemas";
import { createSeedWeekPack } from "./testFixtures";

describe("WeekPack validation", () => {
  it("accepts a valid WeekPack", () => {
    const result = validateWeekPack(createSeedWeekPack());
    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects missing weekday drills", () => {
    const pack = createSeedWeekPack();
    pack.weekdayProblems = pack.weekdayProblems.slice(0, 4);
    const result = validateWeekPack(pack);
    expect(result.success).toBe(false);
    expect(result.errors.join(" ")).toContain("five weekday");
  });

  it("rejects copied or empty stages", () => {
    const pack = createSeedWeekPack();
    pack.weekdayProblems[0].stages[0].prompt = "";
    const emptyResult = validateWeekPack(pack);
    expect(emptyResult.success).toBe(false);
    expect(emptyResult.errors.join(" ")).toContain("stage prompt");

    const copied = createSeedWeekPack();
    copied.weekdayProblems[0].stages[1].prompt = copied.weekdayProblems[0].stages[0].prompt;
    const copiedResult = validateWeekPack(copied);
    expect(copiedResult.success).toBe(false);
    expect(copiedResult.errors.join(" ")).toContain("duplicate stage");
  });

  it("rejects weekday estimatedMinutes above 20", () => {
    const pack = createSeedWeekPack();
    pack.weekdayProblems[0].estimatedMinutes = 21;
    const result = validateWeekPack(pack);
    expect(result.success).toBe(false);
    expect(result.errors.join(" ")).toContain("weekday");
  });

  it("rejects weekend estimatedMinutes outside 90-120", () => {
    const pack = createSeedWeekPack();
    pack.weekendCapstone.estimatedMinutes = 70;
    const result = validateWeekPack(pack);
    expect(result.success).toBe(false);
    expect(result.errors.join(" ")).toContain("weekend");
  });
});
