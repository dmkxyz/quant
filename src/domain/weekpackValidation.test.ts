import { describe, expect, it } from "vitest";
import { validateWeekPack } from "./schemas";
import { createSeedWeekPack } from "./testFixtures";

describe("WeekPack validation", () => {
  it("accepts a valid WeekPack", () => {
    const result = validateWeekPack(createSeedWeekPack());
    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.data?.prepGuide.sections.length).toBeGreaterThanOrEqual(3);
    expect(result.data?.prepGuide.quickChecks.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects missing prep guide content", () => {
    const pack = createSeedWeekPack() as unknown as Record<string, unknown>;
    delete pack.prepGuide;
    const result = validateWeekPack(pack);
    expect(result.success).toBe(false);
    expect(result.errors.join(" ")).toContain("prep guide");
  });

  it("rejects incomplete prep quick checks", () => {
    const pack = createSeedWeekPack();
    pack.prepGuide.quickChecks[0].answer = "";
    const result = validateWeekPack(pack);
    expect(result.success).toBe(false);
    expect(result.errors.join(" ")).toContain("quick check");
  });

  it("rejects prep day coverage that omits generated problem days", () => {
    const pack = createSeedWeekPack();
    delete pack.prepGuide.dayCoverage.monday;
    const result = validateWeekPack(pack);
    expect(result.success).toBe(false);
    expect(result.errors.join(" ")).toContain("prep coverage");
  });

  it("rejects prep day coverage that references missing sections", () => {
    const pack = createSeedWeekPack();
    pack.prepGuide.dayCoverage.monday = ["missing-section"];
    const result = validateWeekPack(pack);
    expect(result.success).toBe(false);
    expect(result.errors.join(" ")).toContain("missing prep section");
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
