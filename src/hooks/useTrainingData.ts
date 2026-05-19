import { useCallback, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "./useAuth";
import type { Attempt, AttemptScore, LessonBite, Problem, ProblemDay, WeekPack, WeeklyMetrics } from "../domain/contracts";
import { createAttempt, recordStageAnswer, requestHint, submitAttempt } from "../domain/attempts";
import { calculateNextDifficulty } from "../domain/difficulty";
import { computeWeeklyMetrics, createLessonFromScore, scoreAttemptLocally } from "../domain/scoring";
import { createSeedWeekPack } from "../domain/seed";
import { browserTimezone, isoDate, mondayForDate, nextMondayAfter } from "../domain/time";
import { loadJson, removeByPrefix, saveJson } from "../lib/localCache";
import { isSupabaseConfigured, providerStatusLabel, supabase } from "../lib/supabase";

interface ProfileState {
  userId: string;
  displayName: string;
  timezone: string;
  difficultyLevel: number;
}

interface TrainingState {
  profile: ProfileState;
  weekPack: WeekPack;
  attempts: Record<string, Attempt>;
  scores: Record<string, AttemptScore>;
  lessons: LessonBite[];
  providerMessage: string;
  pendingSync: boolean;
  updatedAt: string;
}

export interface TrainingController extends TrainingState {
  allProblems: Problem[];
  metrics: WeeklyMetrics;
  online: boolean;
  loading: boolean;
  getProblemForDay: (day: ProblemDay) => Problem;
  getAttempt: (problem: Problem) => Attempt;
  requestHintForStage: (problem: Problem, stageId: string) => Promise<string>;
  recordAnswerForStage: (problem: Problem, stageId: string, answer: string, coachMessage?: string) => void;
  submitProblem: (problem: Problem, finalAnswer: string, confidence: 1 | 2 | 3 | 4 | 5, elapsedSeconds: number) => Promise<void>;
  generateNextWeek: () => Promise<void>;
  resetCache: () => void;
  updateTimezone: (timezone: string) => Promise<void>;
}

const CACHE_PREFIX = "quant:training:";

export function useTrainingData(user: AuthUser | null): TrainingController | null {
  const [state, setState] = useState<TrainingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(() => navigator.onLine);

  const cacheKey = user ? `${CACHE_PREFIX}${user.id}` : "";

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setState(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const cached = loadJson<TrainingState>(cacheKey);
    const initial = cached ?? createInitialState(user);
    setState(initial);
    saveJson(cacheKey, initial);
    setLoading(false);

    if (canUseRemote(user, online)) {
      hydrateRemote(user, cacheKey).then((remoteState) => {
        if (remoteState) {
          setState(remoteState);
          saveJson(cacheKey, remoteState);
        }
      });
    }
  }, [cacheKey, online, user]);

  const allProblems = useMemo(() => (state ? [...state.weekPack.weekdayProblems, state.weekPack.weekendCapstone] : []), [state]);

  const metrics = useMemo(
    () =>
      state
        ? computeWeeklyMetrics({
            problems: allProblems,
            attempts: Object.values(state.attempts),
            scores: Object.values(state.scores)
          })
        : {
            hintRate: 0,
            completionRate: 0,
            avgCorrectness: 0,
            avgReasoning: 0,
            avgTimeRatio: 0,
            weakConcepts: [],
            masteredConcepts: []
          },
    [allProblems, state]
  );

  const persist = useCallback(
    (recipe: (current: TrainingState) => TrainingState) => {
      setState((current) => {
        if (!current) return current;
        const next = { ...recipe(current), updatedAt: new Date().toISOString() };
        saveJson(cacheKey, next);
        return next;
      });
    },
    [cacheKey]
  );

  const getProblemForDay = useCallback(
    (day: ProblemDay) => {
      const problem = allProblems.find((item) => item.day === day) ?? allProblems[0];
      if (!problem) throw new Error("No problem loaded");
      return problem;
    },
    [allProblems]
  );

  const getAttempt = useCallback(
    (problem: Problem) => {
      if (!state || !user) throw new Error("Training data is not loaded");
      const existing = state.attempts[problem.id];
      if (existing) return existing;
      const attempt = createAttempt(user.id, problem);
      persist((current) => ({ ...current, attempts: { ...current.attempts, [problem.id]: attempt } }));
      void syncAttempt(user, problem, attempt, online);
      return attempt;
    },
    [online, persist, state, user]
  );

  const requestHintForStage = useCallback(
    async (problem: Problem, stageId: string) => {
      if (!state || !user) return "";
      const stage = problem.stages.find((item) => item.id === stageId);
      if (!stage) return "";
      const attempt = state.attempts[problem.id] ?? createAttempt(user.id, problem);
      const result = requestHint(attempt, stage);
      persist((current) => ({
        ...current,
        attempts: { ...current.attempts, [problem.id]: result.attempt },
        pendingSync: !online
      }));

      if (canUseRemote(user, online) && isUuid(problem.id) && isUuid(result.attempt.id)) {
        const { data, error } = await supabase!.functions.invoke("coach_turn", {
          body: {
            problem_id: problem.id,
            attempt_id: result.attempt.id,
            stage_id: stageId,
            hint_request: true,
            hint_level: result.hintLevel
          }
        });
        persist((current) => ({
          ...current,
          providerMessage: error ? `Coach fallback: ${error.message}` : `Coach: ${data?.source ?? "openrouter"}`,
          pendingSync: false
        }));
        if (!error && typeof data?.message === "string") return data.message;
      }

      return result.hint;
    },
    [online, persist, state, user]
  );

  const recordAnswerForStage = useCallback(
    (problem: Problem, stageId: string, answer: string, coachMessage?: string) => {
      if (!state || !user) return;
      const attempt = state.attempts[problem.id] ?? createAttempt(user.id, problem);
      const updated = recordStageAnswer(
        attempt,
        stageId,
        answer,
        coachMessage
          ? {
              role: "coach",
              message: coachMessage,
              createdAt: new Date().toISOString(),
              kind: "coach_feedback"
            }
          : undefined
      );
      persist((current) => ({
        ...current,
        attempts: { ...current.attempts, [problem.id]: updated },
        pendingSync: !online
      }));
      void syncAttempt(user, problem, updated, online);
    },
    [online, persist, state, user]
  );

  const submitProblem = useCallback(
    async (problem: Problem, finalAnswer: string, confidence: 1 | 2 | 3 | 4 | 5, elapsedSeconds: number) => {
      if (!state || !user) return;
      const attempt = state.attempts[problem.id] ?? createAttempt(user.id, problem);
      const submitted = submitAttempt(attempt, finalAnswer, confidence, elapsedSeconds);
      const score = scoreAttemptLocally(submitted, problem);
      const lesson = createLessonFromScore(score, problem, user.id);

      persist((current) => ({
        ...current,
        attempts: { ...current.attempts, [problem.id]: submitted },
        scores: { ...current.scores, [submitted.id]: score },
        lessons: upsertLesson(current.lessons, lesson),
        pendingSync: !online
      }));

      await syncAttempt(user, problem, submitted, online);
      if (canUseRemote(user, online) && isUuid(problem.id) && isUuid(submitted.id)) {
        const grade = await supabase!.functions.invoke("grade_attempt", { body: { attempt_id: submitted.id } });
        await supabase!.functions.invoke("summarize_lesson", { body: { attempt_id: submitted.id } });
        persist((current) => ({
          ...current,
          providerMessage: grade.error ? `Grade fallback: ${grade.error.message}` : "Grade synced through Supabase",
          pendingSync: false
        }));
      }
    },
    [online, persist, state, user]
  );

  const generateNextWeek = useCallback(async () => {
    if (!state || !user) return;
    const nextWeekStart = isoDate(nextMondayAfter(new Date()));
    const nextDifficulty = calculateNextDifficulty(state.profile.difficultyLevel, metrics);
    if (canUseRemote(user, online)) {
      await supabase!.functions.invoke("refresh_progress_metrics", {
        body: { user_id: user.id, week_start_date: state.weekPack.weekStartDate }
      });
      const { error } = await supabase!.functions.invoke("generate_week", {
        body: { user_id: user.id, target_week_start_date: nextWeekStart }
      });
      if (!error) {
        const remoteState = await hydrateRemote(user, cacheKey);
        if (remoteState) {
          setState(remoteState);
          saveJson(cacheKey, remoteState);
          return;
        }
      }
    }

    const nextWeek = createSeedWeekPack(user.id, nextWeekStart, nextDifficulty);
    persist((current) => ({
      ...current,
      profile: { ...current.profile, difficultyLevel: nextDifficulty },
      weekPack: nextWeek,
      attempts: {},
      scores: {},
      providerMessage: "Generated deterministic local WeekPack"
    }));
  }, [cacheKey, metrics, online, persist, state, user]);

  const resetCache = useCallback(() => {
    if (!user) return;
    removeByPrefix(cacheKey);
    const initial = createInitialState(user);
    setState(initial);
    saveJson(cacheKey, initial);
  }, [cacheKey, user]);

  const updateTimezone = useCallback(
    async (timezone: string) => {
      persist((current) => ({ ...current, profile: { ...current.profile, timezone } }));
      if (canUseRemote(user, online)) {
        await supabase!.from("profiles").upsert({ user_id: user!.id, timezone }, { onConflict: "user_id" });
      }
    },
    [online, persist, user]
  );

  if (!state || !user) return null;
  return {
    ...state,
    allProblems,
    metrics,
    online,
    loading,
    getProblemForDay,
    getAttempt,
    requestHintForStage,
    recordAnswerForStage,
    submitProblem,
    generateNextWeek,
    resetCache,
    updateTimezone
  };
}

function createInitialState(user: AuthUser): TrainingState {
  const timezone = browserTimezone();
  const weekPack = createSeedWeekPack(user.id, isoDate(mondayForDate(new Date())), 1);
  return {
    profile: {
      userId: user.id,
      displayName: user.displayName,
      timezone,
      difficultyLevel: 1
    },
    weekPack,
    attempts: {},
    scores: {},
    lessons: [
      {
        id: `lesson-${user.id}-base-rates`,
        userId: user.id,
        sourceWeekId: weekPack.id,
        concept: "base rates",
        explanation: "Start with the neutral sample space before reacting to a detail in the prompt.",
        example: "For a symmetric coin game, begin at 0.50 before applying conditional information.",
        commonTrap: "Starting with the most memorable detail instead of the base case.",
        revisitPrompt: "Revisit today's first stage and write only the base-rate argument.",
        masteryStatus: "new",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    providerMessage: providerStatusLabel(),
    pendingSync: false,
    updatedAt: new Date().toISOString()
  };
}

async function hydrateRemote(user: AuthUser, cacheKey: string): Promise<TrainingState | null> {
  if (!supabase) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .upsert(
      { user_id: user.id, display_name: user.displayName, timezone: browserTimezone() },
      { onConflict: "user_id", ignoreDuplicates: false }
    )
    .select("*")
    .single();

  const { data: week } = await supabase
    .from("week_packs")
    .select("*")
    .eq("user_id", user.id)
    .order("week_start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!week) {
    await supabase.functions.invoke("generate_week", {
      body: { user_id: user.id, target_week_start_date: isoDate(mondayForDate(new Date())) }
    });
    return loadJson<TrainingState>(cacheKey);
  }

  const { data: problemRows } = await supabase.from("problems").select("*").eq("week_pack_id", week.id).eq("user_id", user.id);
  if (!problemRows?.length) return null;
  const problems = problemRows.map(remoteProblemToDomain).sort((a, b) => dayOrder(a.day) - dayOrder(b.day));
  const weekdayProblems = problems.filter((problem) => problem.kind === "weekday_drill");
  const weekendCapstone = problems.find((problem) => problem.kind === "weekend_capstone") ?? weekdayProblems[0];
  const weekPack: WeekPack = {
    id: week.id,
    userId: user.id,
    weekStartDate: week.week_start_date,
    generatedAt: week.generated_at,
    difficultyTarget: Number(week.difficulty_target),
    weekdayProblems,
    weekendCapstone,
    conceptMap: buildConceptMap(problems),
    generationRationale: week.generation_rationale
  };

  return {
    profile: {
      userId: user.id,
      displayName: profile?.display_name ?? user.displayName,
      timezone: profile?.timezone ?? browserTimezone(),
      difficultyLevel: Number(profile?.difficulty_level ?? 1)
    },
    weekPack,
    attempts: {},
    scores: {},
    lessons: [],
    providerMessage: "Loaded hosted Supabase WeekPack",
    pendingSync: false,
    updatedAt: new Date().toISOString()
  };
}

async function syncAttempt(user: AuthUser, problem: Problem, attempt: Attempt, online: boolean) {
  if (!canUseRemote(user, online) || !isUuid(problem.id) || !isUuid(attempt.id)) return;
  await supabase!.from("attempts").upsert(
    {
      id: attempt.id,
      user_id: user.id,
      problem_id: problem.id,
      started_at: attempt.startedAt,
      submitted_at: attempt.submittedAt ?? null,
      elapsed_seconds: attempt.elapsedSeconds,
      hints_used: attempt.hintsUsed,
      self_confidence: attempt.selfConfidence,
      submitted_answer: attempt.submittedAnswer,
      status: attempt.submittedAt ? "submitted" : "in_progress"
    },
    { onConflict: "id" }
  );

  for (const stage of attempt.stageProgress) {
    await supabase!.from("attempt_stage_progress").upsert(
      {
        attempt_id: attempt.id,
        stage_id: stage.stageId,
        answer: stage.answer,
        hints_used: stage.hintsUsed,
        coach_turns: stage.coachTurns,
        completed_at: stage.completedAt ?? null
      },
      { onConflict: "attempt_id,stage_id" }
    );
  }
}

function canUseRemote(user: AuthUser | null, online: boolean): boolean {
  return Boolean(user && !user.isTestMode && online && isSupabaseConfigured && supabase);
}

interface RemoteProblemRow {
  id: string;
  week_pack_id: string;
  day: ProblemDay;
  kind: Problem["kind"];
  difficulty: number | string;
  difficulty_label: Problem["difficultyLabel"];
  concepts: string[];
  title: string;
  prompt: string;
  stages: Problem["stages"];
  expected_reasoning: string[];
  rubric: Problem["rubric"];
  estimated_minutes: number;
}

function remoteProblemToDomain(row: RemoteProblemRow): Problem {
  return {
    id: row.id,
    weekId: row.week_pack_id,
    day: row.day,
    kind: row.kind,
    difficulty: Number(row.difficulty),
    difficultyLabel: row.difficulty_label,
    concepts: row.concepts ?? [],
    title: row.title,
    prompt: row.prompt,
    stages: row.stages ?? [],
    expectedReasoning: row.expected_reasoning ?? [],
    rubric: row.rubric,
    estimatedMinutes: row.estimated_minutes
  };
}

function buildConceptMap(problems: Problem[]): Record<string, string[]> {
  return problems.reduce<Record<string, string[]>>((acc, problem) => {
    for (const concept of problem.concepts) acc[concept] = [...(acc[concept] ?? []), problem.id];
    return acc;
  }, {});
}

function dayOrder(day: ProblemDay): number {
  return ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].indexOf(day);
}

function upsertLesson(lessons: LessonBite[], lesson: LessonBite): LessonBite[] {
  return [lesson, ...lessons.filter((item) => item.id !== lesson.id)].slice(0, 40);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
