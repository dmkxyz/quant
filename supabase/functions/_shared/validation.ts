import { z } from "https://esm.sh/zod@4.4.3";

const nonEmptyString = z.string().trim().min(1);

export const problemStageSchema = z.object({
  id: nonEmptyString,
  title: nonEmptyString,
  prompt: nonEmptyString,
  expectedUserAction: z.enum(["estimate", "calculate", "explain", "compare", "decide", "reflect"]),
  hints: z.array(nonEmptyString).min(3),
  expectedReasoning: z.array(nonEmptyString).min(1),
  rubricFocus: z.array(nonEmptyString).min(1)
});

export const problemRubricSchema = z.object({
  correctnessCriteria: z.array(nonEmptyString).min(1),
  reasoningCriteria: z.array(nonEmptyString).min(1),
  communicationCriteria: z.array(nonEmptyString).min(1),
  calibrationCriteria: z.array(nonEmptyString).min(1),
  commonMistakes: z.array(nonEmptyString).min(1)
});

export const problemSchema = z.object({
  id: nonEmptyString,
  weekId: nonEmptyString,
  day: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
  kind: z.enum(["weekday_drill", "weekend_capstone"]),
  difficulty: z.number().min(0.5).max(5),
  difficultyLabel: z.enum(["beginner", "developing", "intermediate", "advanced", "expert"]),
  concepts: z.array(nonEmptyString).min(1),
  title: nonEmptyString,
  prompt: nonEmptyString,
  stages: z.array(problemStageSchema).min(1),
  expectedReasoning: z.array(nonEmptyString).min(1),
  rubric: problemRubricSchema,
  estimatedMinutes: z.number().int().positive()
});

export const weekPackSchema = z.object({
  id: nonEmptyString,
  userId: nonEmptyString,
  weekStartDate: nonEmptyString,
  generatedAt: nonEmptyString,
  difficultyTarget: z.number().min(0.5).max(5),
  weekdayProblems: z.array(problemSchema),
  weekendCapstone: problemSchema,
  conceptMap: z.record(z.string(), z.array(nonEmptyString)),
  generationRationale: nonEmptyString
});

export const attemptScoreSchema = z.object({
  id: nonEmptyString,
  attemptId: nonEmptyString,
  correctness: z.number().min(0).max(1),
  reasoningQuality: z.number().min(0).max(1),
  communicationQuality: z.number().min(0).max(1),
  calibration: z.number().min(0).max(1),
  conceptScores: z.record(z.string(), z.number().min(0).max(1)),
  strengths: z.array(nonEmptyString).min(1),
  mistakes: z.array(nonEmptyString),
  nextStepRecommendation: nonEmptyString,
  createdAt: nonEmptyString
});

export const lessonBiteSchema = z.object({
  id: nonEmptyString,
  userId: nonEmptyString,
  sourceProblemId: z.string().optional(),
  sourceWeekId: z.string().optional(),
  concept: nonEmptyString,
  explanation: nonEmptyString,
  example: nonEmptyString,
  commonTrap: nonEmptyString,
  revisitPrompt: nonEmptyString,
  masteryStatus: z.enum(["new", "weak", "practicing", "mastered"]),
  createdAt: nonEmptyString,
  updatedAt: nonEmptyString
});

export type WeekPack = z.infer<typeof weekPackSchema>;
export type Problem = z.infer<typeof problemSchema>;
export type AttemptScore = z.infer<typeof attemptScoreSchema>;
export type LessonBite = z.infer<typeof lessonBiteSchema>;

export function validateWeekPack(payload: unknown): { success: boolean; data?: WeekPack; errors: string[] } {
  const parsed = weekPackSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) };
  }
  const data = parsed.data;
  const errors: string[] = [];
  const weekdayDays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  if (data.weekdayProblems.length !== 5) errors.push("WeekPack must include exactly five weekday drills.");
  for (const day of weekdayDays) {
    if (!data.weekdayProblems.some((problem) => problem.day === day)) errors.push(`Missing ${day} drill.`);
  }
  for (const problem of data.weekdayProblems) {
    if (problem.kind !== "weekday_drill") errors.push(`${problem.id} must be weekday_drill.`);
    if (problem.estimatedMinutes > 20) errors.push(`${problem.id} weekday estimatedMinutes exceeds 20.`);
    validateStages(problem, errors);
  }
  if (data.weekendCapstone.kind !== "weekend_capstone") errors.push("Weekend problem must be weekend_capstone.");
  if (data.weekendCapstone.estimatedMinutes < 90 || data.weekendCapstone.estimatedMinutes > 120) {
    errors.push("Weekend estimatedMinutes must be between 90 and 120.");
  }
  validateStages(data.weekendCapstone, errors);
  return errors.length ? { success: false, errors } : { success: true, data, errors: [] };
}

export function validateAttemptScore(payload: unknown): { success: boolean; data?: AttemptScore; errors: string[] } {
  const parsed = attemptScoreSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) };
  }
  return { success: true, data: parsed.data, errors: [] };
}

export function validateLessonBites(payload: unknown): { success: boolean; data?: LessonBite[]; errors: string[] } {
  const parsed = z.array(lessonBiteSchema).safeParse(payload);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) };
  }
  return { success: true, data: parsed.data, errors: [] };
}

function validateStages(problem: Problem, errors: string[]) {
  const seen = new Set<string>();
  for (const stage of problem.stages) {
    const prompt = stage.prompt.trim().replace(/\s+/g, " ").toLowerCase();
    if (!prompt) errors.push(`${problem.id} has empty stage prompt.`);
    if (seen.has(prompt)) errors.push(`${problem.id} has duplicate stage prompt.`);
    seen.add(prompt);
  }
}

export const weekPackJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "userId",
    "weekStartDate",
    "generatedAt",
    "difficultyTarget",
    "weekdayProblems",
    "weekendCapstone",
    "conceptMap",
    "generationRationale"
  ],
  properties: {
    id: { type: "string" },
    userId: { type: "string" },
    weekStartDate: { type: "string" },
    generatedAt: { type: "string" },
    difficultyTarget: { type: "number", minimum: 0.5, maximum: 5 },
    weekdayProblems: { type: "array", minItems: 5, maxItems: 5, items: { $ref: "#/$defs/problem" } },
    weekendCapstone: { $ref: "#/$defs/problem" },
    conceptMap: { type: "object", additionalProperties: { type: "array", items: { type: "string" } } },
    generationRationale: { type: "string" }
  },
  $defs: {
    stage: {
      type: "object",
      additionalProperties: false,
      required: ["id", "title", "prompt", "expectedUserAction", "hints", "expectedReasoning", "rubricFocus"],
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        prompt: { type: "string" },
        expectedUserAction: { enum: ["estimate", "calculate", "explain", "compare", "decide", "reflect"] },
        hints: { type: "array", minItems: 3, items: { type: "string" } },
        expectedReasoning: { type: "array", items: { type: "string" } },
        rubricFocus: { type: "array", items: { type: "string" } }
      }
    },
    rubric: {
      type: "object",
      additionalProperties: false,
      required: ["correctnessCriteria", "reasoningCriteria", "communicationCriteria", "calibrationCriteria", "commonMistakes"],
      properties: {
        correctnessCriteria: { type: "array", items: { type: "string" } },
        reasoningCriteria: { type: "array", items: { type: "string" } },
        communicationCriteria: { type: "array", items: { type: "string" } },
        calibrationCriteria: { type: "array", items: { type: "string" } },
        commonMistakes: { type: "array", items: { type: "string" } }
      }
    },
    problem: {
      type: "object",
      additionalProperties: false,
      required: [
        "id",
        "weekId",
        "day",
        "kind",
        "difficulty",
        "difficultyLabel",
        "concepts",
        "title",
        "prompt",
        "stages",
        "expectedReasoning",
        "rubric",
        "estimatedMinutes"
      ],
      properties: {
        id: { type: "string" },
        weekId: { type: "string" },
        day: { enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] },
        kind: { enum: ["weekday_drill", "weekend_capstone"] },
        difficulty: { type: "number", minimum: 0.5, maximum: 5 },
        difficultyLabel: { enum: ["beginner", "developing", "intermediate", "advanced", "expert"] },
        concepts: { type: "array", items: { type: "string" } },
        title: { type: "string" },
        prompt: { type: "string" },
        stages: { type: "array", items: { $ref: "#/$defs/stage" } },
        expectedReasoning: { type: "array", items: { type: "string" } },
        rubric: { $ref: "#/$defs/rubric" },
        estimatedMinutes: { type: "integer" }
      }
    }
  }
} as const;

export const attemptScoreJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "attemptId",
    "correctness",
    "reasoningQuality",
    "communicationQuality",
    "calibration",
    "conceptScores",
    "strengths",
    "mistakes",
    "nextStepRecommendation",
    "createdAt"
  ],
  properties: {
    id: { type: "string" },
    attemptId: { type: "string" },
    correctness: { type: "number", minimum: 0, maximum: 1 },
    reasoningQuality: { type: "number", minimum: 0, maximum: 1 },
    communicationQuality: { type: "number", minimum: 0, maximum: 1 },
    calibration: { type: "number", minimum: 0, maximum: 1 },
    conceptScores: { type: "object", additionalProperties: { type: "number", minimum: 0, maximum: 1 } },
    strengths: { type: "array", items: { type: "string" } },
    mistakes: { type: "array", items: { type: "string" } },
    nextStepRecommendation: { type: "string" },
    createdAt: { type: "string" }
  }
} as const;

export const lessonBitesJsonSchema = {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,
    required: [
      "id",
      "userId",
      "concept",
      "explanation",
      "example",
      "commonTrap",
      "revisitPrompt",
      "masteryStatus",
      "createdAt",
      "updatedAt"
    ],
    properties: {
      id: { type: "string" },
      userId: { type: "string" },
      sourceProblemId: { type: "string" },
      sourceWeekId: { type: "string" },
      concept: { type: "string" },
      explanation: { type: "string" },
      example: { type: "string" },
      commonTrap: { type: "string" },
      revisitPrompt: { type: "string" },
      masteryStatus: { enum: ["new", "weak", "practicing", "mastered"] },
      createdAt: { type: "string" },
      updatedAt: { type: "string" }
    }
  }
} as const;
