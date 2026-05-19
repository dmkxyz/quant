# Copy-Ready Codex Goal Prompt: Quant PWA

Paste the prompt below into a fresh Codex session. If the goal tool is available in that session, create a goal from the objective and then execute it end to end.

```text
You are Codex, working in /Users/adishankara/projects/quant.

Goal: Build a greenfield, Android-friendly progressive web app that trains me for Jane Street-style quantitative trading interviews through daily bite-sized interactive drills, a larger weekend capstone, adaptive difficulty, OpenRouter-generated original problem sets, and revisitable lesson bites.

Context and inspiration:
- Use Jane Street's public trading interview framing as the product model: interviews are conversational, test foundational trading skills, and emphasize probability/statistics, problem solving, clear communication, methodical reasoning, correcting mistakes, asking why, and being open to feedback.
- Reference: https://www.janestreet.com/trading-interviews/
- The app must generate original practice problems inspired by this interview format. Do not copy the YouTube mock interview's exact questions, transcript, wording, or proprietary interview content.

Non-negotiable v1 architecture:
- Build a mobile-first PWA, not a native Android app.
- Use React + TypeScript + Vite for the frontend.
- Use Tailwind CSS for styling.
- Use Supabase for Auth, Postgres persistence, Row Level Security, Edge Functions, and scheduled weekly generation.
- Use GitHub Pages for frontend/PWA hosting. Supabase is the backend platform, not the static frontend host.
- Use Supabase Edge Functions for every LLM call. No OpenRouter API key, service role key, database secret, or other server secret may be bundled into browser code.
- Use OpenRouter as the LLM provider from Supabase Edge Functions via server-side environment variables.
- Use `OPENROUTER_API_KEY`, optional `OPENROUTER_MODEL`, and `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1` in Supabase Function secrets/local function env. If `OPENROUTER_MODEL` is blank, choose a current OpenRouter model suitable for structured JSON, tutoring/coaching, and moderate cost.
- Use JSON-schema-shaped prompts plus Zod validation for all LLM outputs that write to the database. Retry once on invalid output, then fall back to deterministic seed content.
- Make the app work well on Android Chrome: installable manifest, service worker, touch-first UI, responsive layout, offline read access to already-generated problems and lesson bites.
- Single-user-first is acceptable for v1, but implement normal Supabase Auth and per-user data ownership so the app can support multiple users later.

Environment and secret files:
- Read frontend public config from `.env.local`:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_APP_NAME`
  - `VITE_BASE_PATH=/quant/`
- Read OpenRouter function config from `supabase/functions/.env.local`:
  - `OPENROUTER_API_KEY`
  - `OPENROUTER_MODEL` optional; leave blank to let Codex choose
  - `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`
  - `OPENROUTER_SITE_URL`
  - `OPENROUTER_APP_NAME=Quant`
- Read deployment credentials from `.env.deploy.local` when needed:
  - `SUPABASE_ACCESS_TOKEN`
  - `SUPABASE_PROJECT_REF`
  - `SUPABASE_DB_PASSWORD`
  - `GITHUB_AUTH_MODE=gh_cli`
  - `GITHUB_ACTIVE_ACCOUNT=dmkxyz`
  - `GITHUB_REPOSITORY=dmkxyz/quant`
- Never commit real `.env*` files. Keep `.env.example`, `supabase/functions/.env.example`, and deployment documentation committed.

Initialize the project:
- If /Users/adishankara/projects/quant is empty, initialize a git repo and create the app there.
- If files already exist, inspect them first and preserve user changes.
- Supabase CLI is already installed through Homebrew and the workspace has already been initialized and linked to the configured hosted project. Re-verify with `supabase --version` and `supabase db query --linked 'select 1;'` before deploying migrations/functions.
- Docker is not required for the main implementation path because hosted Supabase is already linked and verified. Use Docker only if local Supabase/Edge Function serving is explicitly useful.
- Add a README with setup, required environment variables, Supabase commands, local development, testing, and deployment notes.
- Add `.gitignore` entries for node_modules, build output, Supabase local secrets, `.env` files, Playwright artifacts, and coverage.
- The local `gh` CLI is expected to be authenticated. `GITHUB_REPOSITORY` is set to `dmkxyz/quant`. If that repo does not exist, create it with public visibility using `gh repo create`, push the completed app, and configure GitHub Pages deployment.

Core product behavior:
- The main app has six primary screens: Today, Week, Weekend, Lessons, Progress, and Settings.
- Today shows the current weekday drill, the user's current step, timer, hint controls, answer input, confidence selector, coaching feedback, and final score once submitted.
- Week shows the full Monday-Friday drill plan plus weekend capstone preview, completion state, concept tags, estimated minutes, and locked/unlocked states.
- Weekend shows the larger capstone problem for Saturday/Sunday with a 90-120 minute target, multiple stages, and synthesis of the week's concepts.
- Lessons shows lesson bites organized by concept, week, recency, and weak/mastered status.
- Progress shows week-over-week metrics: hint rate, solve quality, reasoning quality, time spent, completion rate, streak, concepts introduced, concepts mastered, weak concepts, and difficulty trend.
- Settings allows timezone review, LLM provider status, a disabled notification preference row labeled "Notifications coming later", reset local cache, and sign out.

Training cadence:
- Weekday drills should target no more than 20 minutes.
- Each weekday drill is solved step by step: the app asks one prompt at a time, the user thinks/answers, then can request hints or submit.
- Hints must be graduated. First hint nudges framing, second hint suggests a method, third hint exposes a key intermediate step. Avoid immediately giving the final answer.
- The coach should respond conversationally, asking useful follow-up questions and rewarding clear reasoning, correction of mistakes, and calibrated uncertainty.
- The weekend capstone should target 90-120 minutes and combine the week's concepts in a creative, non-trivial way.
- A full upcoming WeekPack must be generated automatically on Sunday for the following Monday-Sunday.
- Seed an initial WeekPack so the user can start immediately before the first Sunday job runs.

Scheduling:
- Store the user's timezone from the browser using Intl.DateTimeFormat().resolvedOptions().timeZone, with manual override in Settings.
- Treat Monday as the first training day of a generated week.
- Implement a scheduled Supabase job that invokes the `generate_week` Edge Function on Sundays. For v1, a UTC cron that runs hourly on Sundays is acceptable; the function should generate only for users whose local date is Sunday and who do not already have a WeekPack for the upcoming week.
- Ensure `generate_week` is idempotent using a unique user_id + week_start_date constraint and a generation_runs table.

Frontend hosting:
- Build the frontend as a static Vite PWA.
- Configure Vite's production `base` to `/quant/` for GitHub Pages.
- Add a GitHub Actions workflow that builds the app and deploys the `dist` output to GitHub Pages.
- After the Pages URL is known, update Supabase Auth settings so the site URL and redirect allow-list include `https://dmkxyz.github.io/quant/`.
- Final verification must include opening the deployed GitHub Pages URL in a mobile viewport and confirming the PWA can load, sign in/test-auth, navigate, and invoke Supabase-backed flows.

Adaptive difficulty:
- Maintain a numeric difficulty_level per user, starting at 1.0 and bounded from 0.5 to 5.0.
- Each problem also has a difficulty value and human label: beginner, developing, intermediate, advanced, expert.
- Compute weekly metrics from completed attempts:
  - hint_rate = total_hints_used / max(1, total_available_hint_slots)
  - completion_rate = completed_problems / assigned_problems
  - avg_correctness = mean AttemptScore.correctness
  - avg_reasoning = mean AttemptScore.reasoningQuality
  - avg_time_ratio = mean(elapsed_minutes / estimated_minutes)
  - weak_concepts = concepts with concept score below 0.65
  - mastered_concepts = concepts with concept score at or above 0.82 across at least two attempts
- Increase next week's difficulty by +0.25 when completion_rate >= 0.8, hint_rate <= 0.25, avg_correctness >= 0.78, avg_reasoning >= 0.75, and avg_time_ratio <= 1.15.
- Decrease next week's difficulty by -0.25 when hint_rate >= 0.5, avg_correctness < 0.62, avg_reasoning < 0.62, completion_rate < 0.6, or avg_time_ratio >= 1.35.
- Otherwise keep difficulty stable.
- When difficulty increases, introduce slightly more multi-step probability, estimation, expected value, game reasoning, market-making intuition, or adversarial reasoning.
- When difficulty decreases, keep the same concepts but simplify numbers, reduce branching, and include more scaffolding.
- Do not jump difficulty by more than one step per week.

Define these TypeScript contracts before implementing UI or functions:

type ProblemKind = "weekday_drill" | "weekend_capstone";
type ProblemDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
type DifficultyLabel = "beginner" | "developing" | "intermediate" | "advanced" | "expert";

interface ProblemStage {
  id: string;
  title: string;
  prompt: string;
  expectedUserAction: "estimate" | "calculate" | "explain" | "compare" | "decide" | "reflect";
  hints: string[];
  expectedReasoning: string[];
  rubricFocus: string[];
}

interface ProblemRubric {
  correctnessCriteria: string[];
  reasoningCriteria: string[];
  communicationCriteria: string[];
  calibrationCriteria: string[];
  commonMistakes: string[];
}

interface Problem {
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

interface WeekPack {
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

interface AttemptStageProgress {
  stageId: string;
  answer: string;
  hintsUsed: number;
  coachTurns: CoachTurn[];
  completedAt?: string;
}

interface Attempt {
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

interface AttemptScore {
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

interface LessonBite {
  id: string;
  userId: string;
  sourceProblemId?: string;
  sourceWeekId?: string;
  concept: string;
  explanation: string;
  example: string;
  commonTrap: string;
  revisitPrompt: string;
  masteryStatus: "new" | "weak" | "practicing" | "mastered";
  createdAt: string;
  updatedAt: string;
}

interface CoachTurn {
  role: "user" | "coach";
  message: string;
  createdAt: string;
  kind: "answer" | "hint_request" | "coach_feedback" | "reflection";
}

Supabase schema requirements:
- profiles: id, user_id, display_name, timezone, difficulty_level, created_at, updated_at.
- week_packs: id, user_id, week_start_date, difficulty_target, status, generated_at, generation_rationale, raw_payload.
- problems: id, user_id, week_pack_id, day, kind, difficulty, difficulty_label, concepts, title, prompt, stages, expected_reasoning, rubric, estimated_minutes.
- attempts: id, user_id, problem_id, started_at, submitted_at, elapsed_seconds, hints_used, self_confidence, submitted_answer, status.
- attempt_stage_progress: id, attempt_id, stage_id, answer, hints_used, coach_turns, completed_at.
- attempt_scores: id, user_id, attempt_id, correctness, reasoning_quality, communication_quality, calibration, concept_scores, strengths, mistakes, next_step_recommendation, created_at.
- lesson_bites: id, user_id, source_problem_id, source_week_id, concept, explanation, example, common_trap, revisit_prompt, mastery_status, created_at, updated_at.
- progress_snapshots: id, user_id, week_start_date, metrics, weak_concepts, mastered_concepts, difficulty_before, difficulty_after, created_at.
- generation_runs: id, user_id, target_week_start_date, status, started_at, finished_at, error_message.
- Enable RLS on all user-owned tables.
- Authenticated users can select/insert/update/delete only their own rows where appropriate.
- Edge Functions may use service-role access only server-side for scheduled generation and administrative writes.

Supabase Edge Functions:
- generate_week
  - Inputs: optional user_id and target_week_start_date for manual generation; otherwise scheduled mode scans eligible users.
  - Reads profile, recent progress_snapshots, recent attempts, weak/mastered concepts, and existing week packs.
  - Calls OpenRouter to generate a valid WeekPack with five weekday drills and one weekend capstone.
  - Validates shape and constraints before inserting.
  - Is idempotent and records generation_runs.
  - Falls back to a deterministic local seed WeekPack if OpenRouter fails or returns invalid output after retries.
- coach_turn
  - Inputs: problem_id, attempt_id, stage_id, user message or hint request.
  - Returns one focused coaching message, optional hint level, and suggested next action.
  - Must not reveal final answer unless the user has exhausted hints or submitted.
- grade_attempt
  - Inputs: attempt_id.
  - Reads problem rubric and full attempt.
  - Returns AttemptScore with numeric scores between 0 and 1 and specific feedback.
  - Persists the score and triggers lesson summary creation.
- summarize_lesson
  - Inputs: attempt_id or week_pack_id.
  - Produces concise LessonBite records focused on concepts, common traps, and revisit prompts.
- refresh_progress_metrics
  - Inputs: user_id and week_start_date.
  - Recomputes metrics, weak concepts, mastered concepts, and next difficulty.
  - Writes progress_snapshots and updates profiles.difficulty_level.

OpenRouter integration:
- Use `OPENROUTER_API_KEY` only in Supabase Edge Function code.
- Use `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`.
- Use `OPENROUTER_MODEL` as the configured model when provided. If it is blank, choose a current OpenRouter model suitable for reliable structured JSON generation, coaching quality, and reasonable cost, then document the selected model in the README and deployment notes.
- Include optional OpenRouter headers when configured: `HTTP-Referer` from `OPENROUTER_SITE_URL` and `X-Title` from `OPENROUTER_APP_NAME`.
- Keep the provider behind a small adapter so tests can inject mocked responses.
- All OpenRouter outputs that write to the database must be validated by Zod schemas. Invalid outputs should trigger one repair retry and then deterministic fallback.

LLM prompting rules:
- Problem generation should create interview-style reasoning drills in probability, expected value, estimation, combinatorics, conditional reasoning, sequential games, market-making intuition, risk/reward tradeoffs, and calibration.
- Generated problems must be self-contained, original, solvable without finance background, and appropriate for mental or lightweight written work.
- The coach should evaluate the user's reasoning process, not just final answers.
- Store enough generation rationale to explain why each week was chosen, but do not expose chain-of-thought. Expose concise, user-facing reasoning summaries only.

Frontend implementation:
- Use a bottom tab layout optimized for mobile.
- Keep cards compact, readable, and touch-friendly.
- Do not make a marketing landing page; the first authenticated screen should be the training app.
- Unauthenticated users see a minimal sign-in/sign-up screen.
- Because the hosted Supabase project currently has email auto-confirm disabled, E2E tests should use a controlled test-auth flow or admin-created confirmed test user rather than depending on manual inbox confirmation.
- Visual direction:
  - Make the app feel slick, focused, and Matrix-inspired: a dark quant-training console with crisp typography, phosphor-green accents, subtle grid/scanline texture, and fast command-center interactions.
  - Keep the interface readable and professional, not novelty hacker cosplay. Use deep black/charcoal as the base, phosphor green as the primary accent, and small amounts of cyan/amber for secondary states, warnings, and mastery signals so the palette is not one-note green.
  - Use a clean sans-serif for normal UI text and a technical monospace for timers, scores, formulas, probability trees, EV calculations, and console-like coaching snippets.
  - Use thin borders, compact panels, sharp 6-8px radii, soft inner glows, subtle active-state pulses, and restrained micro-interactions. Avoid decorative orbs, heavy gradients, oversized hero sections, nested cards, and visual clutter.
  - Use Matrix-like effects sparingly: faint background code rain or grid texture is acceptable only if it does not reduce legibility, interfere with mobile performance, or distract from problem solving.
  - The Today solving flow should feel like an interactive mission console: current stage, timer, hint budget, confidence, answer input, and coach feedback should be visually prioritized without requiring scrolling for the core action on a typical mobile viewport.
  - Progress and Lessons should feel like an intelligence dashboard: dense, scannable, high-contrast, and graph-first, with concept chips and mastery states that are immediately distinguishable.
  - Validate the design with screenshots at mobile and desktop widths. Fix any text overlap, low-contrast text, cramped touch targets, or unreadable code/math before final delivery.
- Today screen:
  - Shows current problem, stage prompt, estimated time, elapsed timer, answer box, confidence selector, hint button, submit stage, and submit final answer.
  - Displays coaching feedback inline after each turn.
  - Tracks hint count visibly.
- Week screen:
  - Shows each day, status, concepts, estimated minutes, and score when done.
- Weekend screen:
  - Supports long-form multi-stage work and saves progress.
- Lessons screen:
  - Search/filter by concept and mastery status.
  - Each lesson bite shows explanation, example, common trap, and revisit prompt.
- Progress screen:
  - Show weekly trend cards and simple charts for hints, scores, time, streak, weak/mastered concepts, and difficulty level.
- Settings:
  - timezone, account, provider status, local cache reset, manual "generate next week" action for testing, sign out.

Offline/PWA behavior:
- Cache the app shell.
- Cache already-generated problems, attempts-in-progress, lesson bites, and progress summaries locally.
- If offline, allow reading lessons/problems and drafting answers locally.
- When back online, sync draft attempt progress to Supabase.
- Do not attempt LLM coaching or grading while offline; show a clear offline state.

Testing requirements:
- Unit tests for adaptive difficulty:
  - raises difficulty on low hint use and high scores,
  - lowers difficulty on high hint use or weak scores,
  - keeps difficulty stable for mixed performance,
  - respects 0.5 to 5.0 bounds.
- Unit tests for week generation validation:
  - rejects missing weekday drills,
  - rejects copied/empty stages,
  - rejects weekday estimatedMinutes above 20,
  - rejects weekend estimatedMinutes outside 90-120,
  - accepts a valid WeekPack.
- Unit tests for hint accounting and attempt state transitions.
- Edge Function tests or function-level tests with mocked OpenRouter responses for generate_week, coach_turn, grade_attempt, summarize_lesson, and refresh_progress_metrics.
- Playwright mobile tests using an Android-sized viewport:
  - sign in or test-auth flow,
  - open Today,
  - answer a stage,
  - request a hint,
  - submit final answer,
  - view generated lesson bite,
  - navigate Progress.
- Run lint/typecheck/tests before final response.

Implementation sequence:
1. Inspect the empty/current workspace and initialize the repo safely.
2. Scaffold React + TypeScript + Vite + Tailwind + Supabase client + test tooling.
3. Add shared TypeScript domain contracts and validation schemas.
4. Add Supabase migrations, RLS policies, seed data, and function folder structure.
5. Implement adaptive difficulty and WeekPack validation as tested pure modules.
6. Implement Supabase Edge Functions with an OpenRouter provider adapter and mocked/fallback paths.
7. Implement frontend auth, routing, layout, and each primary screen.
8. Implement attempt flow, hint/coaching flow, grading flow, lessons, progress, and offline cache/sync.
9. Add README and deployment/setup documentation.
10. Run verification, start the dev server, and provide the local URL.

Acceptance criteria:
- The app can be installed as a PWA on Android Chrome.
- The app is deployed to GitHub Pages at `https://dmkxyz.github.io/quant/` or the final Pages URL reported by GitHub.
- A user can sign in, see an initial seeded week, solve today's drill step by step, request hints, submit an answer, receive a score, and get lesson bites.
- A Sunday scheduled Supabase generation path exists and can generate the upcoming WeekPack idempotently.
- OpenRouter calls are isolated to Supabase Edge Functions and never expose secrets to browser code.
- Difficulty changes week by week based on measured hint use, quality, completion, and time.
- Offline read access works for existing problems and lessons.
- Tests cover the adaptive rules, generation validation, hint accounting, grading with mocked OpenRouter responses, and a mobile user flow.
- README explains how to configure Supabase, OpenRouter secrets, local development, tests, and deployment.
```

## Source Notes

- Jane Street describes trading interviews as conversational and focused on foundational skills, including problem solving, probability/statistics, clear communication, and methodical reasoning: https://www.janestreet.com/trading-interviews/
- OpenRouter authenticates API calls with Bearer tokens and supports use through OpenAI-compatible clients with `https://openrouter.ai/api/v1`: https://openrouter.ai/docs/api-keys
- Supabase supports scheduled function invocation through Cron/pg_cron and pg_net: https://supabase.com/docs/guides/functions/schedule-functions
- Supabase RLS is the expected authorization boundary for browser-accessed tables: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Edge Function secrets are server-side and must not be exposed in browser code: https://supabase.com/docs/guides/functions/secrets
