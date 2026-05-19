import { z } from "zod";
import type { WeekPack } from "./contracts";

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

export interface WeekPackValidationResult {
  success: boolean;
  data?: WeekPack;
  errors: string[];
}

export function validateWeekPack(payload: unknown): WeekPackValidationResult {
  const parsed = weekPackSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map((issue) => {
        const path = issue.path.join(".");
        if (path.includes(".stages.") && path.endsWith(".prompt")) {
          return `${path}: stage prompt must not be empty.`;
        }
        return `${path || "payload"}: ${issue.message}`;
      })
    };
  }

  const data = parsed.data as WeekPack;
  const errors: string[] = [];
  const weekdayDays = ["monday", "tuesday", "wednesday", "thursday", "friday"];

  if (data.weekdayProblems.length !== 5) {
    errors.push("WeekPack must include exactly five weekday drills.");
  }

  const actualWeekdayDays = data.weekdayProblems.map((problem) => problem.day);
  for (const day of weekdayDays) {
    if (!actualWeekdayDays.includes(day as WeekPack["weekdayProblems"][number]["day"])) {
      errors.push(`WeekPack is missing ${day} weekday drill.`);
    }
  }

  for (const problem of data.weekdayProblems) {
    if (problem.kind !== "weekday_drill") {
      errors.push(`${problem.id} must be a weekday drill.`);
    }
    if (problem.estimatedMinutes > 20) {
      errors.push(`${problem.id} weekday estimatedMinutes must be 20 minutes or less.`);
    }
    validateProblemStages(problem.id, problem.stages, errors);
  }

  if (data.weekendCapstone.kind !== "weekend_capstone") {
    errors.push("Weekend problem must be a weekend capstone.");
  }
  if (data.weekendCapstone.estimatedMinutes < 90 || data.weekendCapstone.estimatedMinutes > 120) {
    errors.push("weekend capstone estimatedMinutes must be between 90 and 120.");
  }
  validateProblemStages(data.weekendCapstone.id, data.weekendCapstone.stages, errors);

  return errors.length > 0 ? { success: false, errors } : { success: true, data, errors: [] };
}

function validateProblemStages(problemId: string, stages: WeekPack["weekdayProblems"][number]["stages"], errors: string[]) {
  const seenPrompts = new Set<string>();
  for (const stage of stages) {
    const normalizedPrompt = stage.prompt.trim().replace(/\s+/g, " ").toLowerCase();
    if (normalizedPrompt.length === 0) {
      errors.push(`${problemId} has an empty stage prompt.`);
    }
    if (seenPrompts.has(normalizedPrompt)) {
      errors.push(`${problemId} has a duplicate stage prompt.`);
    }
    seenPrompts.add(normalizedPrompt);
  }
}
