import type { Problem, ProblemDay, WeekPack, WeeklyPrepGuide } from "./contracts";

type WeekPackMaybePrep = Omit<WeekPack, "prepGuide"> & { prepGuide?: WeeklyPrepGuide };

export function ensureWeekPackPrepGuide(weekPack: WeekPackMaybePrep): WeekPack {
  if (weekPack.prepGuide) return weekPack as WeekPack;
  const problems = [...weekPack.weekdayProblems, weekPack.weekendCapstone];
  return {
    ...weekPack,
    prepGuide: createDefaultWeeklyPrepGuide(problems)
  };
}

export function createDefaultWeeklyPrepGuide(problems: Problem[]): WeeklyPrepGuide {
  const dayCoverage = createDayCoverage(problems, {
    "prep-expected-value": ["expected value", "probability", "base rates"],
    "prep-state-counting": ["conditional probability", "state counting", "dice"],
    "prep-market-scale": ["estimation", "market making", "shares traded", "spread width"],
    "prep-dialogue": ["calibration", "communication", "fair value"]
  });

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
          "Expected value is the average payoff you would get over many repeats of the same bet. Multiply each possible payoff by its probability, then add those products. In interview-style market questions, this average is often the first fair value before you add uncertainty or risk.",
        example:
          "For one fair die, the expected roll is (1 + 2 + 3 + 4 + 5 + 6) / 6 = 3.5. A payoff that equals the die roll has fair value 3.5 before fees, risk, or extra information."
      },
      {
        id: "prep-state-counting",
        title: "Conditioning starts by rewriting the state space",
        kind: "worked_example",
        concepts: ["conditional probability", "state counting", "dice"],
        body:
          "When a prompt reveals new information, do not adjust by instinct. First write the states that are still possible, then count or weight the favorable states inside that smaller set.",
        example:
          "If a fair die is known to be even, the remaining states are 2, 4, and 6. The expected roll is now (2 + 4 + 6) / 3 = 4, not 3.5."
      },
      {
        id: "prep-market-scale",
        title: "Market-size estimates need explicit assumptions",
        kind: "primer",
        concepts: ["estimation", "shares traded", "market making"],
        body:
          "For questions about traded shares, daily volume, or activity levels, the exact fact is usually less important than a defensible estimate. Start with an assumption you can explain, use round numbers, and check whether the final scale is plausible.",
        example:
          "If you estimate 10 million active traders and each trades 100 shares on average, the rough daily share count is 1 billion shares. The number is a model output, not a memorized fact."
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
          { speaker: "tutor", text: "Good. What quote communicates the same midpoint with more uncertainty?" },
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

function createDayCoverage(problems: Problem[], sectionsByConcept: Record<string, string[]>): Partial<Record<ProblemDay, string[]>> {
  const coverage: Partial<Record<ProblemDay, string[]>> = {};
  for (const problem of problems) {
    const matched = new Set<string>();
    for (const concept of problem.concepts) {
      const normalized = concept.toLowerCase();
      for (const [sectionId, needles] of Object.entries(sectionsByConcept)) {
        if (needles.some((needle) => normalized.includes(needle))) matched.add(sectionId);
      }
    }
    if (matched.size === 0) matched.add("prep-expected-value");
    coverage[problem.day] = [...matched];
  }
  return coverage;
}
