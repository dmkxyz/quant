import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.0";
import { corsHeaders, jsonResponse, readJson } from "../_shared/cors.ts";
import { callOpenRouterJson } from "../_shared/openrouter.ts";
import { attemptScoreJsonSchema, validateAttemptScore } from "../_shared/validation.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "POST required" }, 405);

  const body = await readJson(req);
  const userId = await authenticatedUserId(req);
  const attemptId = typeof body.attempt_id === "string" ? body.attempt_id : "";
  if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);
  if (!attemptId) return jsonResponse({ error: "attempt_id is required" }, 400);

  const supabase = serviceClient();
  const { data: attempt, error: attemptError } = await supabase
    .from("attempts")
    .select("*, attempt_stage_progress(*)")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .maybeSingle();
  if (attemptError) return jsonResponse({ error: attemptError.message }, 500);
  if (!attempt) return jsonResponse({ error: "Attempt not found" }, 404);

  const { data: problem, error: problemError } = await supabase
    .from("problems")
    .select("*")
    .eq("id", attempt.problem_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (problemError) return jsonResponse({ error: problemError.message }, 500);
  if (!problem) return jsonResponse({ error: "Problem not found" }, 404);

  const result = await callOpenRouterJson({
    schemaName: "attempt_score",
    jsonSchema: attemptScoreJsonSchema,
    validate: validateAttemptScore,
    system:
      "You grade quant interview practice attempts. Score from 0 to 1. Evaluate correctness, reasoning, communication, and calibration. Give specific feedback without exposing hidden chain-of-thought.",
    user: JSON.stringify({ attemptId, userId, attempt, problem })
  });

  const score =
    result.ok && result.value
      ? result.value
      : {
          id: `score-${attemptId}`,
          attemptId,
          correctness: 0.64,
          reasoningQuality: 0.66,
          communicationQuality: 0.7,
          calibration: 0.62,
          conceptScores: Object.fromEntries((problem.concepts as string[]).map((concept) => [concept, 0.64])),
          strengths: ["You made a clear attempt and exposed your assumptions."],
          mistakes: ["Tighten the conditional update before quoting a final market."],
          nextStepRecommendation: "Write the sample space and one update equation before the next quote.",
          createdAt: new Date().toISOString()
        };

  const { data: inserted, error: insertError } = await supabase
    .from("attempt_scores")
    .upsert(
      {
        user_id: userId,
        attempt_id: attemptId,
        correctness: score.correctness,
        reasoning_quality: score.reasoningQuality,
        communication_quality: score.communicationQuality,
        calibration: score.calibration,
        concept_scores: score.conceptScores,
        strengths: score.strengths,
        mistakes: score.mistakes,
        next_step_recommendation: score.nextStepRecommendation
      },
      { onConflict: "attempt_id" }
    )
    .select("*")
    .single();
  if (insertError) return jsonResponse({ error: insertError.message }, 500);

  return jsonResponse({ score: inserted, source: result.ok ? "openrouter" : "fallback", model: result.model, error: result.error });
});

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
