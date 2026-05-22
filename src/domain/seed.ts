import type { DifficultyLabel, Problem, ProblemRubric, ProblemStage, WeekPack } from "./contracts";
import { labelForDifficulty } from "./difficulty";
import { createDefaultWeeklyPrepGuide } from "./prepGuide";
import { isoDate, mondayForDate } from "./time";

const rubric: ProblemRubric = {
  correctnessCriteria: [
    "Identifies a defensible base rate or fair value.",
    "Updates the estimate when the information set changes.",
    "Connects the final answer to the stated assumptions."
  ],
  reasoningCriteria: [
    "States assumptions before calculating.",
    "Breaks the problem into tractable states.",
    "Checks whether the answer has the right scale."
  ],
  communicationCriteria: [
    "Explains the reasoning in concise steps.",
    "Names uncertainty rather than hiding it.",
    "Corrects mistakes explicitly when noticed."
  ],
  calibrationCriteria: [
    "Separates confidence from certainty.",
    "Adjusts market width based on model fragility.",
    "Makes follow-up checks before over-tightening."
  ],
  commonMistakes: [
    "Treating a first estimate as final.",
    "Ignoring conditioning after a new signal.",
    "Quoting a market that is too tight for the uncertainty."
  ]
};

const weekdayBlueprints = [
  {
    day: "monday" as const,
    title: "Coin Market Warm-Up",
    concepts: ["base rates", "expected value", "calibration"],
    noun: "coin payoff"
  },
  {
    day: "tuesday" as const,
    title: "Conditional Dice Update",
    concepts: ["conditional probability", "state counting", "communication"],
    noun: "dice signal"
  },
  {
    day: "wednesday" as const,
    title: "Inventory-Aware Quote",
    concepts: ["market making", "risk/reward", "spread width"],
    noun: "inventory quote"
  },
  {
    day: "thursday" as const,
    title: "Sequential Bet Checkpoint",
    concepts: ["sequential games", "expected value", "adversarial reasoning"],
    noun: "two-step bet"
  },
  {
    day: "friday" as const,
    title: "Fast Estimation Synthesis",
    concepts: ["estimation", "probability", "error checking"],
    noun: "estimation market"
  }
];

function stages(prefix: string, noun: string): ProblemStage[] {
  return [
    {
      id: `${prefix}-anchor`,
      title: "Anchor",
      prompt: `Set an initial fair value for the ${noun}. State the base rate or symmetry argument before doing arithmetic.`,
      expectedUserAction: "estimate",
      hints: [
        "First identify what would be true if no extra information arrived.",
        "List the equally likely states and mark which ones pay.",
        "Use the midpoint as a first anchor, then prepare to move it."
      ],
      expectedReasoning: ["Use symmetry or base rates to establish a fair starting point."],
      rubricFocus: ["Base rate", "Assumption clarity", "Scale check"]
    },
    {
      id: `${prefix}-update`,
      title: "Update",
      prompt: `A new signal removes one class of states from the ${noun}. Revise the fair value and explain the conditional update.`,
      expectedUserAction: "calculate",
      hints: [
        "Rewrite the sample space after the signal.",
        "Weight the remaining states by likelihood before normalizing.",
        "The update should move only if the removed states were not neutral."
      ],
      expectedReasoning: ["Condition on the observed signal and normalize the remaining states."],
      rubricFocus: ["Conditional probability", "Arithmetic", "Error check"]
    },
    {
      id: `${prefix}-quote`,
      title: "Quote",
      prompt: `Quote a bid/ask market for the ${noun}. Explain how uncertainty, speed, and feedback would change your spread.`,
      expectedUserAction: "decide",
      hints: [
        "Translate uncertainty into width, not just into a lower confidence score.",
        "Tighten the quote only when your assumptions and arithmetic have both been checked.",
        "Name one observation that would make you move the midpoint."
      ],
      expectedReasoning: ["Connect estimate quality to a calibrated market width."],
      rubricFocus: ["Market-making intuition", "Calibration", "Communication"]
    }
  ];
}

function createProblem(args: {
  weekId: string;
  day: Problem["day"];
  kind: Problem["kind"];
  title: string;
  concepts: string[];
  noun: string;
  difficulty: number;
  difficultyLabel: DifficultyLabel;
  estimatedMinutes: number;
}): Problem {
  const id = `${args.weekId}-${args.day}`;
  return {
    id,
    weekId: args.weekId,
    day: args.day,
    kind: args.kind,
    difficulty: args.difficulty,
    difficultyLabel: args.difficultyLabel,
    concepts: args.concepts,
    title: args.title,
    prompt:
      args.kind === "weekend_capstone"
        ? "Build a staged quote, update it as information changes, and write a short post-trade reflection on what you would improve."
        : "Work conversationally. Give an estimate, show the method, then calibrate a market around your uncertainty.",
    stages: stages(id, args.noun),
    expectedReasoning: [
      "Anchor on a base rate.",
      "Update after conditioning on new information.",
      "Quote a market that reflects uncertainty and risk."
    ],
    rubric,
    estimatedMinutes: args.estimatedMinutes
  };
}

export function createSeedWeekPack(
  userId = "local-test-user",
  weekStartDate = isoDate(mondayForDate(new Date())),
  difficultyTarget = 1
): WeekPack {
  const weekId = `seed-${userId}-${weekStartDate}`;
  const difficultyLabel = labelForDifficulty(difficultyTarget);
  const weekdayProblems = weekdayBlueprints.map((blueprint) =>
    createProblem({
      weekId,
      day: blueprint.day,
      kind: "weekday_drill",
      title: blueprint.title,
      concepts: blueprint.concepts,
      noun: blueprint.noun,
      difficulty: difficultyTarget,
      difficultyLabel,
      estimatedMinutes: 18
    })
  );

  const weekendCapstone = createProblem({
    weekId,
    day: "saturday",
    kind: "weekend_capstone",
    title: "Weekend Synthesis: Adaptive Market Game",
    concepts: ["conditional probability", "market making", "sequential games", "calibration"],
    noun: "weekend market game",
    difficulty: Math.min(5, difficultyTarget + 0.25),
    difficultyLabel: labelForDifficulty(Math.min(5, difficultyTarget + 0.25)),
    estimatedMinutes: 105
  });

  const conceptMap = [...weekdayProblems, weekendCapstone].reduce<Record<string, string[]>>((acc, problem) => {
    for (const concept of problem.concepts) {
      acc[concept] = [...(acc[concept] ?? []), problem.id];
    }
    return acc;
  }, {});

  return {
    id: weekId,
    userId,
    weekStartDate,
    generatedAt: new Date().toISOString(),
    difficultyTarget,
    prepGuide: createDefaultWeeklyPrepGuide([...weekdayProblems, weekendCapstone]),
    weekdayProblems,
    weekendCapstone,
    conceptMap,
    generationRationale:
      "Deterministic seed week covering base rates, conditional updates, expected value, market width, and calibration so training can start before scheduled generation runs."
  };
}
