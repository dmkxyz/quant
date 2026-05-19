import type { Problem, WeekPack } from "./validation.ts";

function labelForDifficulty(value: number): Problem["difficultyLabel"] {
  if (value < 1.5) return "beginner";
  if (value < 2.5) return "developing";
  if (value < 3.5) return "intermediate";
  if (value < 4.5) return "advanced";
  return "expert";
}

const rubric = {
  correctnessCriteria: ["Identifies a base rate", "Updates after new information"],
  reasoningCriteria: ["States assumptions", "Checks the scale"],
  communicationCriteria: ["Explains concise steps"],
  calibrationCriteria: ["Separates fair value from confidence"],
  commonMistakes: ["Ignoring conditioning", "Quoting too tight a market"]
};

function stages(prefix: string, noun: string) {
  return [
    {
      id: `${prefix}-anchor`,
      title: "Anchor",
      prompt: `Set an initial fair value for the ${noun} before any extra information arrives.`,
      expectedUserAction: "estimate" as const,
      hints: ["Look for symmetry.", "List equally likely states.", "Use the midpoint as the first anchor."],
      expectedReasoning: ["Use a base rate before updating."],
      rubricFocus: ["Base rate", "Assumption clarity"]
    },
    {
      id: `${prefix}-update`,
      title: "Update",
      prompt: `Revise the ${noun} after a signal removes one class of states.`,
      expectedUserAction: "calculate" as const,
      hints: ["Rewrite the sample space.", "Weight remaining states.", "Normalize after conditioning."],
      expectedReasoning: ["Condition on the observed signal."],
      rubricFocus: ["Conditional probability", "Arithmetic"]
    },
    {
      id: `${prefix}-quote`,
      title: "Quote",
      prompt: `Quote a bid/ask market for the ${noun} and explain the spread width.`,
      expectedUserAction: "decide" as const,
      hints: ["Convert uncertainty into width.", "Tighten only after checks.", "Name what would move the midpoint."],
      expectedReasoning: ["Connect uncertainty to market width."],
      rubricFocus: ["Calibration", "Market-making intuition"]
    }
  ];
}

function problem(args: {
  weekId: string;
  day: Problem["day"];
  kind: Problem["kind"];
  title: string;
  noun: string;
  concepts: string[];
  difficulty: number;
  estimatedMinutes: number;
}): Problem {
  const id = `${args.weekId}-${args.day}`;
  return {
    id,
    weekId: args.weekId,
    day: args.day,
    kind: args.kind,
    difficulty: args.difficulty,
    difficultyLabel: labelForDifficulty(args.difficulty),
    concepts: args.concepts,
    title: args.title,
    prompt: "Work step by step. Estimate, update, then quote a calibrated market.",
    stages: stages(id, args.noun),
    expectedReasoning: ["Anchor with a base rate", "Update after conditioning", "Quote with calibrated uncertainty"],
    rubric,
    estimatedMinutes: args.estimatedMinutes
  };
}

export function createSeedWeekPack(userId: string, weekStartDate: string, difficultyTarget: number): WeekPack {
  const weekId = `seed-${userId}-${weekStartDate}`;
  const weekdayProblems = [
    problem({
      weekId,
      day: "monday",
      kind: "weekday_drill",
      title: "Coin Market Warm-Up",
      noun: "coin payoff",
      concepts: ["base rates", "expected value", "calibration"],
      difficulty: difficultyTarget,
      estimatedMinutes: 18
    }),
    problem({
      weekId,
      day: "tuesday",
      kind: "weekday_drill",
      title: "Conditional Dice Update",
      noun: "dice signal",
      concepts: ["conditional probability", "state counting", "communication"],
      difficulty: difficultyTarget,
      estimatedMinutes: 18
    }),
    problem({
      weekId,
      day: "wednesday",
      kind: "weekday_drill",
      title: "Inventory-Aware Quote",
      noun: "inventory quote",
      concepts: ["market making", "risk/reward", "spread width"],
      difficulty: difficultyTarget,
      estimatedMinutes: 18
    }),
    problem({
      weekId,
      day: "thursday",
      kind: "weekday_drill",
      title: "Sequential Bet Checkpoint",
      noun: "two-step bet",
      concepts: ["sequential games", "expected value", "adversarial reasoning"],
      difficulty: difficultyTarget,
      estimatedMinutes: 18
    }),
    problem({
      weekId,
      day: "friday",
      kind: "weekday_drill",
      title: "Fast Estimation Synthesis",
      noun: "estimation market",
      concepts: ["estimation", "probability", "error checking"],
      difficulty: difficultyTarget,
      estimatedMinutes: 18
    })
  ];
  const weekendCapstone = problem({
    weekId,
    day: "saturday",
    kind: "weekend_capstone",
    title: "Weekend Synthesis: Adaptive Market Game",
    noun: "weekend market game",
    concepts: ["conditional probability", "market making", "sequential games", "calibration"],
    difficulty: Math.min(5, difficultyTarget + 0.25),
    estimatedMinutes: 105
  });
  const conceptMap = [...weekdayProblems, weekendCapstone].reduce<Record<string, string[]>>((acc, item) => {
    for (const concept of item.concepts) acc[concept] = [...(acc[concept] ?? []), item.id];
    return acc;
  }, {});
  return {
    id: weekId,
    userId,
    weekStartDate,
    generatedAt: new Date().toISOString(),
    difficultyTarget,
    weekdayProblems,
    weekendCapstone,
    conceptMap,
    generationRationale:
      "Deterministic fallback week covering base rates, conditional updates, expected value, market width, and calibration."
  };
}
