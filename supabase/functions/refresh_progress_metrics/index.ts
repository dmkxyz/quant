import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.0";
import { corsHeaders, jsonResponse, readJson } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "POST required" }, 405);

  const body = await readJson(req);
  const userId = (typeof body.user_id === "string" ? body.user_id : undefined) ?? (await authenticatedUserId(req));
  const weekStartDate = typeof body.week_start_date === "string" ? body.week_start_date : "";
  if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);
  if (!weekStartDate) return jsonResponse({ error: "week_start_date is required" }, 400);

  const supabase = serviceClient();
  const { data: profile } = await supabase.from("profiles").select("difficulty_level").eq("user_id", userId).maybeSingle();
  const currentDifficulty = Number(profile?.difficulty_level ?? 1);
  const { data: week } = await supabase
    .from("week_packs")
    .select("id")
    .eq("user_id", userId)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();
  if (!week) return jsonResponse({ error: "WeekPack not found" }, 404);

  const { data: problems } = await supabase.from("problems").select("*").eq("week_pack_id", week.id).eq("user_id", userId);
  const problemIds = (problems ?? []).map((problem) => problem.id);
  const { data: attempts } = await supabase.from("attempts").select("*").eq("user_id", userId).in("problem_id", problemIds);
  const attemptIds = (attempts ?? []).map((attempt) => attempt.id);
  const { data: scores } = attemptIds.length
    ? await supabase.from("attempt_scores").select("*").eq("user_id", userId).in("attempt_id", attemptIds)
    : { data: [] };

  const metrics = computeMetrics(problems ?? [], attempts ?? [], scores ?? []);
  const difficultyAfter = nextDifficulty(currentDifficulty, metrics);

  const { data: snapshot, error } = await supabase
    .from("progress_snapshots")
    .upsert(
      {
        user_id: userId,
        week_start_date: weekStartDate,
        metrics,
        weak_concepts: metrics.weakConcepts,
        mastered_concepts: metrics.masteredConcepts,
        difficulty_before: currentDifficulty,
        difficulty_after: difficultyAfter
      },
      { onConflict: "user_id,week_start_date" }
    )
    .select("*")
    .single();
  if (error) return jsonResponse({ error: error.message }, 500);

  await supabase.from("profiles").update({ difficulty_level: difficultyAfter }).eq("user_id", userId);
  return jsonResponse({ snapshot, difficulty_after: difficultyAfter });
});

function computeMetrics(problems: any[], attempts: any[], scores: any[]) {
  const completed = attempts.filter((attempt) => attempt.submitted_at);
  const totalHints = completed.reduce((sum, attempt) => sum + Number(attempt.hints_used ?? 0), 0);
  const totalHintSlots = problems.reduce((sum, problem) => {
    const stages = Array.isArray(problem.stages) ? problem.stages : [];
    return sum + stages.reduce((stageSum: number, stage: any) => stageSum + (Array.isArray(stage.hints) ? stage.hints.length : 0), 0);
  }, 0);
  const conceptScores: Record<string, number[]> = {};
  for (const score of scores) {
    for (const [concept, value] of Object.entries(score.concept_scores ?? {})) {
      conceptScores[concept] = [...(conceptScores[concept] ?? []), Number(value)];
    }
  }
  return {
    hintRate: totalHints / Math.max(1, totalHintSlots),
    completionRate: completed.length / Math.max(1, problems.length),
    avgCorrectness: mean(scores.map((score) => Number(score.correctness ?? 0))),
    avgReasoning: mean(scores.map((score) => Number(score.reasoning_quality ?? 0))),
    avgTimeRatio: mean(
      completed.map((attempt) => {
        const problem = problems.find((item) => item.id === attempt.problem_id);
        return Number(attempt.elapsed_seconds ?? 0) / 60 / Math.max(1, Number(problem?.estimated_minutes ?? 20));
      })
    ),
    weakConcepts: Object.entries(conceptScores)
      .filter(([, values]) => mean(values) < 0.65)
      .map(([concept]) => concept),
    masteredConcepts: Object.entries(conceptScores)
      .filter(([, values]) => values.length >= 2 && mean(values) >= 0.82)
      .map(([concept]) => concept)
  };
}

function nextDifficulty(current: number, metrics: ReturnType<typeof computeMetrics>) {
  const increase =
    metrics.completionRate >= 0.8 &&
    metrics.hintRate <= 0.25 &&
    metrics.avgCorrectness >= 0.78 &&
    metrics.avgReasoning >= 0.75 &&
    metrics.avgTimeRatio <= 1.15;
  const decrease =
    metrics.hintRate >= 0.5 ||
    metrics.avgCorrectness < 0.62 ||
    metrics.avgReasoning < 0.62 ||
    metrics.completionRate < 0.6 ||
    metrics.avgTimeRatio >= 1.35;
  if (decrease) return clamp(current - 0.25);
  if (increase) return clamp(current + 0.25);
  return clamp(current);
}

function clamp(value: number) {
  return Math.min(5, Math.max(0.5, Number(value.toFixed(2))));
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function authenticatedUserId(req: Request): Promise<string | undefined> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return undefined;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } }
  });
  const { data } = await supabase.auth.getUser();
  return data.user?.id;
}

function serviceClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}
