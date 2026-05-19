import type { DifficultyLabel, WeeklyMetrics } from "./contracts";

export function clampDifficulty(value: number): number {
  return Math.min(5, Math.max(0.5, Number(value.toFixed(2))));
}

export function labelForDifficulty(value: number): DifficultyLabel {
  const difficulty = clampDifficulty(value);
  if (difficulty < 1.5) return "beginner";
  if (difficulty < 2.5) return "developing";
  if (difficulty < 3.5) return "intermediate";
  if (difficulty < 4.5) return "advanced";
  return "expert";
}

export function calculateNextDifficulty(currentDifficulty: number, metrics: WeeklyMetrics): number {
  const shouldIncrease =
    metrics.completionRate >= 0.8 &&
    metrics.hintRate <= 0.25 &&
    metrics.avgCorrectness >= 0.78 &&
    metrics.avgReasoning >= 0.75 &&
    metrics.avgTimeRatio <= 1.15;

  const shouldDecrease =
    metrics.hintRate >= 0.5 ||
    metrics.avgCorrectness < 0.62 ||
    metrics.avgReasoning < 0.62 ||
    metrics.completionRate < 0.6 ||
    metrics.avgTimeRatio >= 1.35;

  if (shouldDecrease) return clampDifficulty(currentDifficulty - 0.25);
  if (shouldIncrease) return clampDifficulty(currentDifficulty + 0.25);
  return clampDifficulty(currentDifficulty);
}
