import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.0";
import { z } from "https://esm.sh/zod@4.4.3";
import { corsHeaders, jsonResponse, readJson } from "../_shared/cors.ts";
import { callOpenRouterJson } from "../_shared/openrouter.ts";

const coachSchema = z.object({
  message: z.string().trim().min(1),
  hintLevel: z.number().int().min(1).max(3).optional(),
  suggestedNextAction: z.enum(["answer_stage", "request_hint", "submit_final", "reflect"])
});

const coachJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["message", "suggestedNextAction"],
  properties: {
    message: { type: "string" },
    hintLevel: { type: "integer", minimum: 1, maximum: 3 },
    suggestedNextAction: { enum: ["answer_stage", "request_hint", "submit_final", "reflect"] }
  }
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "POST required" }, 405);

  const body = await readJson(req);
  const userId = await authenticatedUserId(req);
  if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

  const problemId = stringValue(body.problem_id);
  const stageId = stringValue(body.stage_id);
  const userMessage = stringValue(body.message) || "Hint requested.";
  const hintRequest = body.hint_request === true;
  const hintLevel = typeof body.hint_level === "number" ? Math.min(3, Math.max(1, Math.floor(body.hint_level))) : undefined;
  if (!problemId || !stageId) return jsonResponse({ error: "problem_id and stage_id are required" }, 400);

  const supabase = serviceClient();
  const { data: problem, error } = await supabase
    .from("problems")
    .select("title, prompt, stages, rubric, concepts")
    .eq("id", problemId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return jsonResponse({ error: error.message }, 500);
  if (!problem) return jsonResponse({ error: "Problem not found" }, 404);

  const stage = (problem.stages as Array<Record<string, unknown>>).find((item) => item.id === stageId);
  const result = await callOpenRouterJson({
    schemaName: "coach_turn",
    jsonSchema: coachJsonSchema,
    validate: (payload) => {
      const parsed = coachSchema.safeParse(payload);
      return parsed.success
        ? { success: true, data: parsed.data, errors: [] }
        : { success: false, errors: parsed.error.issues.map((issue) => issue.message) };
    },
    system:
      "You are a concise quant interview coach. Coach the reasoning process. Do not reveal the final answer unless the user has exhausted hints or submitted.",
    user: JSON.stringify({
      problemTitle: problem.title,
      problemPrompt: problem.prompt,
      concepts: problem.concepts,
      stage,
      hintRequest,
      hintLevel,
      userMessage
    })
  });

  if (result.ok && result.value) return jsonResponse({ ...result.value, source: "openrouter", model: result.model });
  return jsonResponse({
    message:
      hintRequest && stage && Array.isArray(stage.hints)
        ? String(stage.hints[Math.max(0, (hintLevel ?? 1) - 1)] ?? "Start by naming the sample space.")
        : "Frame the problem first: base rate, update, or quote. Then state the assumption you are least sure about.",
    hintLevel,
    suggestedNextAction: "answer_stage",
    source: "fallback",
    error: result.error
  });
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

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
