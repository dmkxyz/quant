import type { WeekPack } from "./contracts";
import { createSeedWeekPack as createDomainSeedWeekPack } from "./seed";

export function createSeedWeekPack(overrides: Partial<WeekPack> = {}): WeekPack {
  return {
    ...createDomainSeedWeekPack("user-1", "2026-05-18", 1),
    id: "seed-week",
    ...overrides
  };
}
