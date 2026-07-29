# praxis

A private rhythm dashboard for practice, habits, training, and making. Praxis
brings classical-guitar sessions, contribution-style habit grids, GitHub
activity, Hevy workouts, and Strava activity into one calm view.

## What it tracks

- **Overview** — today’s practice target, habits, and side-by-side contribution
  grids for practice, habits, Hevy, and Strava.
- **Habits** — create color-coded habits, check them off once per day, and see a
  full-year GitHub-style history for each one.
- **Practice** — a timestamp-accurate timer with focus areas, repertoire,
  targets, notes, ratings, history, and detailed statistics.
- **GitHub** — displays the public contribution calendar for `danieljcksn`,
  annual totals, active days, weekly output, streaks, and the busiest day.
- **Hevy** — imports all workout days and displays total duration plus the exact
  start/end time of each active day.
- **Strava** — refreshes short-lived OAuth tokens server-side and imports activity
  days, moving time, distance, elevation, and exact daily hours.
- **Supabase sync** — mirrors durable state to Postgres. Existing browser data is
  migrated on the first cloud connection; JSON export/import remains available.
- **Appearance** — starts from the device preference, then remembers an explicit
  light or dark choice without flashing the wrong theme during page load.

## Visual system

Praxis uses a semantic color system with complete dark and warm-paper light
palettes. Surfaces, borders, contribution grids, status colors, focus states,
overlays, shadows, and browser chrome all switch together.

Typography uses the supplied Tiempos family:

- **Tiempos Text** for interface copy and tabular figures
- **Tiempos Headline** for page and card hierarchy
- **Tiempos Fine** for the large practice clock

The bundled font files and their original personal-use license are kept in
`app/fonts/tiempos`.

## Security model

Every page and API route is protected by a shared password. A successful unlock
sets a signed, HttpOnly, SameSite cookie. Supabase, Hevy, and Strava secrets are
only read by server routes and are never bundled into browser JavaScript.

The Supabase migration enables Row Level Security on every exposed table, grants
no access to `anon` or `authenticated`, and uses the server-only Supabase secret
key for authorized operations.

## Local setup

```bash
pnpm install
cp .env.example .env.local
pnpm dlx supabase@latest db push --db-url "$POSTGRES_URL_NON_POOLING"
pnpm dev
```

The required runtime variables are documented in `.env.example`. A direct
Postgres URL is only needed while applying migrations.

For Strava activity history, set the application callback domain to the deployed
hostname (for example `danpraxis.vercel.app`). If an initial developer token only
has `read` scope, use **Training → Connect with Strava** once; Praxis requests
`activity:read_all`, then stores each newly rotated token in the protected
`integration_tokens` table.

## Scripts

| command | what it does |
| --- | --- |
| `pnpm dev` | start the development server |
| `pnpm build` | create a production build |
| `pnpm start` | serve the production build |
| `pnpm typecheck` | run `tsc --noEmit` |

## Stack

- Next.js App Router, React 19, and TypeScript
- Tailwind CSS v4 with a CSS-first theme
- Tiempos Text, Headline, and Fine through `next/font/local`
- Zustand for optimistic local state and timer resilience
- Supabase Postgres for durable state and integration caches
- Hevy public API and Strava API v3

## Project layout

```text
app/
  api/               password, data, Hevy, and Strava server routes
  habits/            contribution-based habit tracking
  practice/          session timer
  training/          Hevy and Strava activity
components/
  activity/          reusable contribution grid
  dashboard/         cross-domain overview
  habits/            habit cards and editor
  training/          workout and activity visualizations
  timer/             practice timer workflow
lib/
  github.ts          server-side GitHub contribution sync
  hevy.ts            server-side Hevy sync
  strava.ts          server-side OAuth refresh and activity sync
  store.ts           local state plus Supabase snapshot model
supabase/migrations/  RLS-protected database schema
```
