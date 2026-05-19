import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.0";
import { corsHeaders, jsonResponse, readJson } from "../_shared/cors.ts";
import { callOpenRouterJson } from "../_shared/openrouter.ts";
import { createSeedWeekPack } from "../_shared/seed.ts";
import { validateWeekPack, weekPackJsonSchema, type Problem, type WeekPack } from "../_shared/validation.ts";

interface ProfileRow {
  user_id: string;
  timezone: string | null;
  difficulty_level: number | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "POST required" }, 405);

  const body = await readJson(req);
  const supabase = serviceClient();

  const scheduled = body.scheduled === true;
  const explicitUserId = typeof body.user_id === "string" ? body.user_id : undefined;
  const explicitWeekStart = typeof body.target_week_start_date === "string" ? body.target_week_start_date : undefined;

  const profiles = scheduled
    ? await scheduledProfiles(supabase)
    : await manualProfiles(supabase, req, explicitUserId);

  const results = [];
  for (const profile of profiles) {
    const targetWeekStartDate = explicitWeekStart ?? nextMondayIso(profile.timezone ?? "UTC");
    results.push(await generateForProfile(supabase, profile, targetWeekStartDate));
  }

  return jsonResponse({ results });
});

async function scheduledProfiles(supabase: ReturnType<typeof serviceClient>): Promise<ProfileRow[]> {
  const { data, error } = await supabase.from("profiles").select("user_id, timezone, difficulty_level");
  if (error) throw error;
  return (data ?? []).filter((profile) => isSunday(profile.timezone ?? "UTC")) as ProfileRow[];
}

async function manualProfiles(
  supabase: ReturnType<typeof serviceClient>,
  req: Request,
  explicitUserId?: string
): Promise<ProfileRow[]> {
  const userId = explicitUserId ?? (await authenticatedUserId(req));
  if (!userId) throw new Error("Missing authenticated user");

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, timezone, difficulty_level")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return [data as ProfileRow];

  const timezone = "UTC";
  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({ user_id: userId, timezone, difficulty_level: 1 })
    .select("user_id, timezone, difficulty_level")
    .single();
  if (insertError) throw insertError;
  return [inserted as ProfileRow];
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

async function generateForProfile(
  supabase: ReturnType<typeof serviceClient>,
  profile: ProfileRow,
  targetWeekStartDate: string
) {
  const existing = await supabase
    .from("week_packs")
    .select("id")
    .eq("user_id", profile.user_id)
    .eq("week_start_date", targetWeekStartDate)
    .maybeSingle();
  if (existing.data) {
    await upsertGenerationRun(supabase, profile.user_id, targetWeekStartDate, "skipped", "WeekPack already exists");
    return { user_id: profile.user_id, target_week_start_date: targetWeekStartDate, status: "skipped" };
  }

  await upsertGenerationRun(supabase, profile.user_id, targetWeekStartDate, "started");
  const difficulty = Number(profile.difficulty_level ?? 1);
  const providerResult = await callOpenRouterJson<WeekPack>({
    schemaName: "week_pack",
    jsonSchema: weekPackJsonSchema,
    validate: validateWeekPack,
    system:
      "You generate original quant trading interview practice. Return JSON only. Do not copy proprietary interview questions. Keep problems self-contained and solvable with probability, expected value, estimation, and clear reasoning.",
    user: `Create one WeekPack for user ${profile.user_id}, weekStartDate ${targetWeekStartDate}, difficulty ${difficulty}. Include Monday-Friday drills under 20 minutes and one Saturday/Sunday capstone between 90 and 120 minutes. Use graduated hints and concise user-facing rationale.`
  });

  const weekPack =
    providerResult.ok && providerResult.value
      ? providerResult.value
      : createSeedWeekPack(profile.user_id, targetWeekStartDate, difficulty);

  const validation = validateWeekPack(weekPack);
  if (!validation.success || !validation.data) {
    await upsertGenerationRun(supabase, profile.user_id, targetWeekStartDate, "failed", validation.errors.join("; "));
    return { user_id: profile.user_id, target_week_start_date: targetWeekStartDate, status: "failed", errors: validation.errors };
  }

  const { data: dbWeek, error: weekError } = await supabase
    .from("week_packs")
    .insert({
      user_id: profile.user_id,
      week_start_date: targetWeekStartDate,
      difficulty_target: validation.data.difficultyTarget,
      status: "ready",
      generated_at: validation.data.generatedAt,
      generation_rationale: validation.data.generationRationale,
      raw_payload: validation.data
    })
    .select("id")
    .single();
  if (weekError) {
    await upsertGenerationRun(supabase, profile.user_id, targetWeekStartDate, "failed", weekError.message);
    return { user_id: profile.user_id, target_week_start_date: targetWeekStartDate, status: "failed", error: weekError.message };
  }

  const problems = [...validation.data.weekdayProblems, validation.data.weekendCapstone].map((problem) =>
    problemRow(profile.user_id, dbWeek.id, problem)
  );
  const { error: problemsError } = await supabase.from("problems").insert(problems);
  if (problemsError) {
    await upsertGenerationRun(supabase, profile.user_id, targetWeekStartDate, "failed", problemsError.message);
    return { user_id: profile.user_id, target_week_start_date: targetWeekStartDate, status: "failed", error: problemsError.message };
  }

  await upsertGenerationRun(supabase, profile.user_id, targetWeekStartDate, "succeeded");
  return {
    user_id: profile.user_id,
    target_week_start_date: targetWeekStartDate,
    status: "succeeded",
    source: providerResult.ok ? "openrouter" : "fallback",
    model: providerResult.model
  };
}

function problemRow(userId: string, weekPackId: string, problem: Problem) {
  return {
    user_id: userId,
    week_pack_id: weekPackId,
    day: problem.day,
    kind: problem.kind,
    difficulty: problem.difficulty,
    difficulty_label: problem.difficultyLabel,
    concepts: problem.concepts,
    title: problem.title,
    prompt: problem.prompt,
    stages: problem.stages,
    expected_reasoning: problem.expectedReasoning,
    rubric: problem.rubric,
    estimated_minutes: problem.estimatedMinutes
  };
}

async function upsertGenerationRun(
  supabase: ReturnType<typeof serviceClient>,
  userId: string,
  targetWeekStartDate: string,
  status: "started" | "succeeded" | "failed" | "skipped",
  errorMessage?: string
) {
  await supabase.from("generation_runs").upsert(
    {
      user_id: userId,
      target_week_start_date: targetWeekStartDate,
      status,
      started_at: new Date().toISOString(),
      finished_at: status === "started" ? null : new Date().toISOString(),
      error_message: errorMessage ?? null
    },
    { onConflict: "user_id,target_week_start_date" }
  );
}

function serviceClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

function isSunday(timezone: string): boolean {
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: timezone }).format(new Date());
  return weekday === "Sun";
}

function nextMondayIso(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});
  const localDate = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
  const day = localDate.getUTCDay();
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7;
  localDate.setUTCDate(localDate.getUTCDate() + daysUntilMonday);
  return localDate.toISOString().slice(0, 10);
}
