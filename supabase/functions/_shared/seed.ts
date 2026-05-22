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

function prepGuide(problems: Problem[]): WeekPack["prepGuide"] {
  const dayCoverage = problems.reduce<WeekPack["prepGuide"]["dayCoverage"]>((acc, problem) => {
    if (problem.concepts.some((concept) => concept.includes("conditional") || concept.includes("state"))) {
      acc[problem.day] = ["prep-state-counting", "prep-expected-value"];
    } else if (problem.concepts.some((concept) => concept.includes("market") || concept.includes("spread"))) {
      acc[problem.day] = ["prep-market-scale", "prep-dialogue"];
    } else {
      acc[problem.day] = ["prep-expected-value", "prep-dialogue"];
    }
    return acc;
  }, {});

  return {
    title: "Foundations for this week",
    estimatedMinutes: 15,
    prerequisiteConcepts: [
      "expected value",
      "state counting",
      "rough market-size estimation",
      "fair value",
      "bid/ask spread",
      "calibration"
    ],
    learningObjectives: [
      "Compute a simple expected value before quoting a number.",
      "List equally likely states before conditioning on a signal.",
      "Use transparent assumptions for order-of-magnitude market estimates.",
      "Separate a fair midpoint from the width needed for uncertainty."
    ],
    sections: [
      {
        id: "prep-expected-value",
        title: "Expected value is the weighted average payoff",
        kind: "primer",
        concepts: ["expected value", "probability", "fair value"],
        body:
          "Expected value is the average payoff you would get over many repeats of the same bet. Multiply each possible payoff by its probability, then add those products.",
        example:
          "For one fair die, the expected roll is (1 + 2 + 3 + 4 + 5 + 6) / 6 = 3.5."
      },
      {
        id: "prep-state-counting",
        title: "Conditioning starts by rewriting the state space",
        kind: "worked_example",
        concepts: ["conditional probability", "state counting", "dice"],
        body:
          "When a prompt reveals new information, write the states that are still possible, then count or weight favorable states inside that smaller set.",
        example:
          "If a fair die is known to be even, the remaining states are 2, 4, and 6, so the expected roll is 4."
      },
      {
        id: "prep-market-scale",
        title: "Market-size estimates need explicit assumptions",
        kind: "primer",
        concepts: ["estimation", "shares traded", "market making"],
        body:
          "For traded shares, daily volume, or activity levels, start with an assumption you can explain, use round numbers, and check whether the final scale is plausible.",
        example:
          "Ten million active traders times one hundred shares each gives a rough daily count of one billion shares."
      },
      {
        id: "prep-dialogue",
        title: "A fair quote separates midpoint and uncertainty",
        kind: "dialogue",
        concepts: ["calibration", "bid/ask spread", "communication"],
        body:
          "A quote has two jobs: the midpoint says what you think the fair value is, and the width says how uncertain or exposed you are.",
        dialogueTurns: [
          { speaker: "tutor", text: "If your fair value is 50 but your model is fragile, should you quote 49/51?" },
          { speaker: "student", text: "Probably not. That spread says I am more certain than I really am." },
          { speaker: "tutor", text: "What quote communicates the same midpoint with more uncertainty?" },
          { speaker: "student", text: "Maybe 45/55, with an explanation of which assumption would move the midpoint." }
        ]
      }
    ],
    quickChecks: [
      {
        id: "check-expected-die",
        prompt: "What is the expected value of one fair six-sided die roll?",
        answer: "3.5",
        explanation: "Average the equally likely rolls: (1 + 2 + 3 + 4 + 5 + 6) / 6 = 3.5.",
        relatedConcepts: ["expected value", "dice"]
      },
      {
        id: "check-even-die",
        prompt: "A fair die is known to be even. What states remain before you calculate anything else?",
        answer: "2, 4, and 6",
        explanation: "Conditioning means replacing the original sample space with only the states consistent with the signal.",
        relatedConcepts: ["conditional probability", "state counting"]
      },
      {
        id: "check-wide-market",
        prompt: "If your midpoint is 50 but your assumptions are weak, what should usually happen to your market width?",
        answer: "It should widen.",
        explanation: "Uncertainty affects the spread around the fair value; it does not automatically move the fair midpoint.",
        relatedConcepts: ["calibration", "bid/ask spread"]
      }
    ],
    dayCoverage
  };
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
    prepGuide: prepGuide([...weekdayProblems, weekendCapstone]),
    weekdayProblems,
    weekendCapstone,
    conceptMap,
    generationRationale:
      "Deterministic fallback week covering base rates, conditional updates, expected value, market width, and calibration."
  };
}
