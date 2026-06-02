# Local Analytics Runbook

This runbook starts the anonymous session analytics stack locally.

## Requirements

- Docker running locally
- Supabase CLI installed
- npm dependencies installed with `npm install`

## One-Time Setup

```bash
cp supabase/.env.local.example supabase/.env.local
supabase start
supabase status
```

For local Edge Functions, Supabase injects the internal `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` automatically. Do not copy the host-facing
`http://127.0.0.1:54321` URL into the function env file; inside Docker that
would point back to the Edge Runtime container instead of Supabase Kong.

Do not use `SUPABASE_` prefixes in `supabase/.env.local`; the Supabase CLI
reserves that namespace and skips those keys when serving Edge Functions.

`ALLOWED_ORIGINS` accepts a comma-separated list of exact origins only. Add each
deployed learner or dashboard URL explicitly, for example
`https://bespoke-sprinkles-1d8a52.netlify.app`.

## Start Local Services

Terminal 1:

```bash
npm run supabase:start
```

Terminal 2:

```bash
npm run analytics:functions
```

Terminal 3:

```bash
VITE_SESSION_ANALYTICS_ENDPOINT=http://127.0.0.1:54321/functions/v1/analytics-event npm run dev:with-analytics
```

Terminal 4:

```bash
npm run dev:analytics
```

Open:

- learner app: `http://127.0.0.1:4173`
- analytics dashboard: `http://127.0.0.1:5174`
- Supabase Studio: `http://127.0.0.1:54323`

## Analytics-Free Build

The normal learner app remains analytics-free by default:

```bash
npm run dev
npm test
```

When `VITE_SESSION_ANALYTICS_ENABLED` is not `true`, no session tracking,
heartbeats, or analytics API calls are made.
