# Quant

Quant is a mobile-first progressive web app for daily Jane Street-style quantitative trading interview drills. It uses React, TypeScript, Vite, Tailwind CSS, Supabase Auth/Postgres/RLS/Edge Functions, and OpenRouter-backed problem generation.

## What Is Included

- Six app screens: Today, Week, Weekend, Lessons, Progress, and Settings.
- Android-friendly PWA manifest, service worker, installable app shell, and local offline cache for generated problems, attempts, lessons, and progress summaries.
- Supabase schema with RLS for per-user ownership across profiles, WeekPacks, problems, attempts, scores, lessons, progress snapshots, and generation runs.
- Supabase Edge Functions for `generate_week`, `coach_turn`, `grade_attempt`, `summarize_lesson`, and `refresh_progress_metrics`.
- OpenRouter calls only run inside Edge Functions. Browser code never reads `OPENROUTER_API_KEY`, service-role keys, or deployment secrets.
- Deterministic fallback WeekPack, coach, grading, and lesson behavior when OpenRouter is unavailable or invalid after one retry.
- Unit tests and Playwright Android/desktop flow tests.

## Environment Files

Create local files from the committed examples:

```bash
cp .env.example .env.local
cp .env.deploy.example .env.deploy.local
cp supabase/functions/.env.example supabase/functions/.env.local
```

Frontend public config in `.env.local`:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=replace-with-supabase-anon-key
VITE_APP_NAME=Quant
VITE_BASE_PATH=/quant/
```

OpenRouter function config in `supabase/functions/.env.local`:

```bash
OPENROUTER_API_KEY=sk-or-replace-me
OPENROUTER_MODEL=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_SITE_URL=http://localhost:5173
OPENROUTER_APP_NAME=Quant
```

If `OPENROUTER_MODEL` is blank, the Edge Function adapter defaults to `google/gemini-3.1-flash-lite`. That model was selected from the current OpenRouter models API because it supports `response_format`, has a large context window, and is priced for moderate recurring generation/coaching usage.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:5173/quant/?testAuth=1` and use **Test auth** for local E2E-style usage without email confirmation. Normal Supabase email/password auth is available when `.env.local` points to a configured project.

## Supabase

Verify the CLI and hosted link:

```bash
supabase --version
set -a; source .env.deploy.local; set +a; supabase db query --linked 'select 1;'
```

Deploy schema and functions:

```bash
set -a; source .env.deploy.local; set +a; supabase db push --linked
supabase functions deploy generate_week coach_turn grade_attempt summarize_lesson refresh_progress_metrics
supabase secrets set --env-file supabase/functions/.env.local
```

The migration creates the Sunday hourly cron hook `quant-generate-week-sunday-hourly`. Configure the hosted database settings described in [supabase/README.md](supabase/README.md) so cron can invoke `generate_week`.

After GitHub Pages is live, set Supabase Auth site URL and redirect allow-list to include:

```text
https://dmkxyz.github.io/quant/
http://localhost:5173/quant/
```

## Tests

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

The Playwright suite installs/uses Chromium and captures screenshots under `test-results/screenshots/`.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` builds `dist` and deploys it to GitHub Pages on pushes to `main`. Configure repository variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

The production Vite base is `/quant/`, so the expected Pages URL is:

```text
https://dmkxyz.github.io/quant/
```

## Source References

- Jane Street trading interviews: https://www.janestreet.com/trading-interviews/
- OpenRouter structured outputs and model metadata: https://openrouter.ai/docs/features/structured-outputs and https://openrouter.ai/api/v1/models
- Supabase Edge Function scheduling: https://supabase.com/docs/guides/functions/schedule-functions
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Edge Function secrets: https://supabase.com/docs/guides/functions/secrets
