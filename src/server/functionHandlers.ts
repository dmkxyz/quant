import type { AttemptScore, LessonBite, WeekPack, WeeklyMetrics } from "../domain/contracts";
import { calculateNextDifficulty } from "../domain/difficulty";
import { validateWeekPack } from "../domain/schemas";
import { createSeedWeekPack } from "../domain/seed";

export interface GenerateWeekInput {
  userId: string;
  targetWeekStartDate: string;
  difficulty: number;
}

export interface ProviderResponse<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

export async function generateWeekWithProvider(
  input: GenerateWeekInput,
  provider: () => Promise<ProviderResponse<WeekPack>>
): Promise<{ weekPack: WeekPack; source: "llm" | "fallback" }> {
  const response = await provider();
  if (response.ok && response.value) {
    const validation = validateWeekPack(response.value);
    if (validation.success && validation.data) {
      return { weekPack: validation.data, source: "llm" };
    }
  }

  return {
    weekPack: {
      ...createSeedWeekPack(input.userId, input.targetWeekStartDate, input.difficulty),
      id: `fallback-${input.userId}-${input.targetWeekStartDate}`
    },
    source: "fallback"
  };
}

export async function coachTurnWithProvider(
  provider: () => Promise<ProviderResponse<{ message: string; hintLevel?: number; suggestedNextAction: string }>>
): Promise<{ message: string; hintLevel?: number; suggestedNextAction: string; source: "llm" | "fallback" }> {
  const response = await provider();
  if (response.ok && response.value?.message.trim()) {
    return { ...response.value, source: "llm" };
  }

  return {
    message: "Start by naming the frame: base rate, update, or market quote. Then state the assumption you are least sure about.",
    suggestedNextAction: "answer_stage",
    source: "fallback"
  };
}

export async function gradeAttemptWithProvider(
  provider: () => Promise<ProviderResponse<AttemptScore>>
): Promise<{ score: AttemptScore; source: "llm" | "fallback" }> {
  const response = await provider();
  if (response.ok && response.value) {
    return { score: response.value, source: "llm" };
  }

  return {
    source: "fallback",
    score: {
      id: "fallback-score",
      attemptId: "fallback-attempt",
      correctness: 0.64,
      reasoningQuality: 0.68,
      communicationQuality: 0.7,
      calibration: 0.62,
      conceptScores: {
        probability: 0.66,
        "expected value": 0.62,
        calibration: 0.6
      },
      strengths: ["You made a clear initial estimate."],
      mistakes: ["Tighten the link between the signal and the updated probability."],
      nextStepRecommendation: "Re-run the update step and explicitly list the remaining states.",
      createdAt: new Date(0).toISOString()
    }
  };
}

export async function summarizeLessonWithProvider(
  provider: () => Promise<ProviderResponse<LessonBite[]>>
): Promise<{ lessons: LessonBite[]; source: "llm" | "fallback" }> {
  const response = await provider();
  if (response.ok && response.value?.length) {
    return { lessons: response.value, source: "llm" };
  }

  return {
    source: "fallback",
    lessons: [
      {
        id: "fallback-lesson",
        userId: "fallback-user",
        concept: "calibration",
        explanation: "A market quote should separate your estimate from your uncertainty.",
        example: "A fair value near 0.5 can still justify a 0.45/0.55 market if your model is noisy.",
        commonTrap: "Giving a single confident number when the assumptions are fragile.",
        revisitPrompt: "Revisit one previous answer and widen or tighten the market based on uncertainty.",
        masteryStatus: "practicing",
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString()
      }
    ]
  };
}

export function refreshProgressMetrics(currentDifficulty: number, metrics: WeeklyMetrics): {
  difficultyAfter: number;
  weakConcepts: string[];
  masteredConcepts: string[];
} {
  return {
    difficultyAfter: calculateNextDifficulty(currentDifficulty, metrics),
    weakConcepts: metrics.weakConcepts,
    masteredConcepts: metrics.masteredConcepts
  };
}
