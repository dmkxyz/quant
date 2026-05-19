# Supabase Backend

This project uses hosted Supabase for Auth, Postgres, Row Level Security, Edge Functions, and Sunday WeekPack generation.

## Commands

```bash
supabase --version
set -a; source .env.deploy.local; set +a; supabase db query --linked 'select 1;'
set -a; source .env.deploy.local; set +a; supabase db push --linked
supabase functions deploy generate_week coach_turn grade_attempt summarize_lesson refresh_progress_metrics
```

## Cron Settings

The migration creates a `quant-generate-week-sunday-hourly` pg_cron job that calls `public.invoke_quant_generate_week()`.
Before relying on hosted scheduling, configure these database settings in the hosted project:

```sql
alter database postgres set app.quant_generate_week_url = 'https://<project-ref>.supabase.co/functions/v1/generate_week';
alter database postgres set app.quant_generate_week_key = '<service-role-or-invoke-key>';
```

The Edge Function itself remains idempotent through the `user_id + week_start_date` unique constraint and `generation_runs`.

## Auth Settings

For v1, hosted Auth should auto-confirm new email/password users because the app does not require email verification yet and the built-in Supabase mailer has a very low email-send quota. The deployed project is configured with:

```text
site_url=https://dmkxyz.github.io/quant/
uri_allow_list=https://dmkxyz.github.io/quant/,http://localhost:5173/quant/,http://127.0.0.1:5173/quant/
mailer_autoconfirm=true
```

If `mailer_autoconfirm` is false without a custom SMTP provider, signups can fail with `email rate limit exceeded`.
