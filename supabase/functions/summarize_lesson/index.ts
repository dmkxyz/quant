import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.0";
import { corsHeaders, jsonResponse, readJson } from "../_shared/cors.ts";
import { callOpenRouterJson } from "../_shared/openrouter.ts";
import { lessonBitesJsonSchema, validateLessonBites, type LessonBite } from "../_shared/validation.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "POST required" }, 405);

  const body = await readJson(req);
  const userId = await authenticatedUserId(req);
  if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

  const attemptId = typeof body.attempt_id === "string" ? body.attempt_id : undefined;
  const weekPackId = typeof body.week_pack_id === "string" ? body.week_pack_id : undefined;
  if (!attemptId && !weekPackId) return jsonResponse({ error: "attempt_id or week_pack_id is required" }, 400);

  const supabase = serviceClient();
  const context = attemptId
    ? await attemptContext(supabase, userId, attemptId)
    : await weekContext(supabase, userId, weekPackId!);

  const result = await callOpenRouterJson<LessonBite[]>({
    schemaName: "lesson_bites",
    jsonSchema: lessonBitesJsonSchema,
    validate: validateLessonBites,
    system:
      "Create concise lesson bites for quant interview practice. Focus on concepts, common traps, and revisit prompts. Return JSON only.",
    user: JSON.stringify({ userId, context })
  });

  const lessons =
    result.ok && result.value
      ? result.value
      : [
          {
            id: `lesson-${attemptId ?? weekPackId}-calibration`,
            userId,
            sourceProblemId: attemptId ? context?.problem?.id : undefined,
            sourceWeekId: weekPackId,
            concept: "calibration",
            explanation: "A good quant answer distinguishes the fair value from the uncertainty around that value.",
            example: "A 0.50 estimate may still deserve a 0.44/0.56 market if the assumptions are fragile.",
            commonTrap: "Moving the midpoint when only the uncertainty changed.",
            revisitPrompt: "Revisit the last quote and write both a midpoint reason and a spread reason.",
            masteryStatus: "practicing" as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];

  const { data, error } = await supabase
    .from("lesson_bites")
    .insert(
      lessons.map((lesson) => ({
        user_id: userId,
        source_problem_id: lesson.sourceProblemId ?? null,
        source_week_id: lesson.sourceWeekId ?? null,
        concept: lesson.concept,
        explanation: lesson.explanation,
        example: lesson.example,
        common_trap: lesson.commonTrap,
        revisit_prompt: lesson.revisitPrompt,
        mastery_status: lesson.masteryStatus
      }))
    )
    .select("*");
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ lessons: data, source: result.ok ? "openrouter" : "fallback", model: result.model, error: result.error });
});

async function attemptContext(supabase: ReturnType<typeof serviceClient>, userId: string, attemptId: string) {
  const { data: attempt } = await supabase
    .from("attempts")
    .select("*, attempt_stage_progress(*), attempt_scores(*)")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .maybeSingle();
  const { data: problem } = attempt
    ? await supabase.from("problems").select("*").eq("id", attempt.problem_id).eq("user_id", userId).maybeSingle()
    : { data: null };
  return { attempt, problem };
}

async function weekContext(supabase: ReturnType<typeof serviceClient>, userId: string, weekPackId: string) {
  const { data: week } = await supabase.from("week_packs").select("*").eq("id", weekPackId).eq("user_id", userId).maybeSingle();
  const { data: problems } = await supabase.from("problems").select("*").eq("week_pack_id", weekPackId).eq("user_id", userId);
  return { week, problems };
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
