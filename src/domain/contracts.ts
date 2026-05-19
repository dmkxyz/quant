export type ProblemKind = "weekday_drill" | "weekend_capstone";
export type ProblemDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";
export type DifficultyLabel = "beginner" | "developing" | "intermediate" | "advanced" | "expert";
export type ExpectedUserAction = "estimate" | "calculate" | "explain" | "compare" | "decide" | "reflect";
export type LessonMasteryStatus = "new" | "weak" | "practicing" | "mastered";

export interface ProblemStage {
  id: string;
  title: string;
  prompt: string;
  expectedUserAction: ExpectedUserAction;
  hints: string[];
  expectedReasoning: string[];
  rubricFocus: string[];
}

export interface ProblemRubric {
  correctnessCriteria: string[];
  reasoningCriteria: string[];
  communicationCriteria: string[];
  calibrationCriteria: string[];
  commonMistakes: string[];
}

export interface Problem {
  id: string;
  weekId: string;
  day: ProblemDay;
  kind: ProblemKind;
  difficulty: number;
  difficultyLabel: DifficultyLabel;
  concepts: string[];
  title: string;
  prompt: string;
  stages: ProblemStage[];
  expectedReasoning: string[];
  rubric: ProblemRubric;
  estimatedMinutes: number;
}

export interface WeekPack {
  id: string;
  userId: string;
  weekStartDate: string;
  generatedAt: string;
  difficultyTarget: number;
  weekdayProblems: Problem[];
  weekendCapstone: Problem;
  conceptMap: Record<string, string[]>;
  generationRationale: string;
}

export interface CoachTurn {
  role: "user" | "coach";
  message: string;
  createdAt: string;
  kind: "answer" | "hint_request" | "coach_feedback" | "reflection";
}

export interface AttemptStageProgress {
  stageId: string;
  answer: string;
  hintsUsed: number;
  coachTurns: CoachTurn[];
  completedAt?: string;
}

export interface Attempt {
  id: string;
  userId: string;
  problemId: string;
  startedAt: string;
  submittedAt?: string;
  elapsedSeconds: number;
  hintsUsed: number;
  stageProgress: AttemptStageProgress[];
  selfConfidence: 1 | 2 | 3 | 4 | 5;
  submittedAnswer: string;
}

export interface AttemptScore {
  id: string;
  attemptId: string;
  correctness: number;
  reasoningQuality: number;
  communicationQuality: number;
  calibration: number;
  conceptScores: Record<string, number>;
  strengths: string[];
  mistakes: string[];
  nextStepRecommendation: string;
  createdAt: string;
}

export interface LessonBite {
  id: string;
  userId: string;
  sourceProblemId?: string;
  sourceWeekId?: string;
  concept: string;
  explanation: string;
  example: string;
  commonTrap: string;
  revisitPrompt: string;
  masteryStatus: LessonMasteryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyMetrics {
  hintRate: number;
  completionRate: number;
  avgCorrectness: number;
  avgReasoning: number;
  avgTimeRatio: number;
  weakConcepts: string[];
  masteredConcepts: string[];
}
