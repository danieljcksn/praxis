# praxis

A private rhythm dashboard for practice, reading, habits, training, and making.
Praxis brings classical-guitar sessions, a book library with real jacket art,
contribution-style habit grids, GitHub activity, Hevy workouts, and Strava
activity into one calm view.

## What it tracks

- **Overview** — today’s practice target, habits, whatever is open on the
  bedside table, and side-by-side contribution grids for practice, habits,
  reading, Hevy, and Strava.
- **Habits** — create color-coded habits, check them off once per day, and see a
  full-year GitHub-style history for each one.
- **Practice** — a timestamp-accurate timer with focus areas, repertoire,
  targets, notes, ratings, history, and detailed statistics.
- **Reading** — a shelf of covers with progress, a per-day reading log, and
  insights. Books are found by title, author, or ISBN through Open Library,
  which fills in the cover, page count, publication year, and blurb; a
  learning ± stepper moves the bookmark and extends the day's latest entry,
  sittings can also be logged by hand for a second session or for reading
  done before you got here, and those entries drive the grids, the pace, and
  the projected finish date. Nothing is ever marked finished without a
  deliberate press.
- **GitHub** — displays the public contribution calendar for `danieljcksn`,
  annual totals, active days, weekly output, streaks, and the busiest day.
- **Hevy** — imports all workout days and displays total duration plus the exact
  start/end time of each active day.
- **Strava** — refreshes short-lived OAuth tokens server-side and imports activity
  days, moving time, distance, elevation, and exact daily hours.
- **Supabase sync** — mirrors durable state to Postgres. Existing browser data is
  migrated on the first cloud connection; JSON export/import remains available.
  The whole app shares one 2 MB payload, so a write that would exceed it is
  refused on the client and reported as "too large to sync" rather than failing
  silently — a silent failure would let a later reload pull the last snapshot
  that did save and overwrite everything logged since.
- **Appearance** — starts from the device preference, then remembers an explicit
  light or dark choice without flashing the wrong theme during page load.

## Visual system

Praxis uses a semantic color system with complete dark and warm-paper light
palettes. Surfaces, borders, contribution grids, status colors, focus states,
overlays, shadows, and browser chrome all switch together. Every domain owns
one hue — practice gold, habits mint, Hevy blue, Strava orange, GitHub green,
reading rose — and nothing borrows another's.

Cover artwork sits in a single frame: one radius, one inset hairline, one 3px
spine gradient, and a few percent of saturation pulled out so a wall of forty
unrelated jackets stays as quiet as the rest of the app. Underneath every
cover is a typographic plate — the title between two rules on a board tinted
from a hash of the book — which serves as both the loading state and the
answer for a book with no artwork, so a shelf never shows an empty rectangle.

Typography is two families with one shared scale, loaded through
`next/font/google`:

- **Instrument Sans** carries everything that is read — copy, labels, controls,
  and tabular figures.
- **Instrument Serif** is rationed to display sizes only (20px floor): page
  titles, metric values, the wordmark, and the practice clock.

Sizes, line-heights, and letter-spacing live together as `--text-*` tokens in
`app/globals.css`, so a call site picks one step (`text-micro` … `text-display-lg`)
and cannot drift. Radii collapse to four steps, and motion to four durations
with one easing pair.

The practice clock renders through `components/ui/Digits.tsx`, which gives each
digit its own `1ch` cell — Instrument Serif has no tabular-figure feature, so
without it the clock would shift sideways every time a `1` ticked over.

Both families are fetched at build time, so there are no font binaries in the
repository.

## The catalogue

Book search runs through `app/api/books/route.ts` rather than from the browser.
Open Library grants 3 requests a second to clients that identify themselves
with a descriptive `User-Agent` and 1 to everyone else, and a browser is not
allowed to set that header at all — so the server does it, behind a serial
queue, a 12-second timeout, one silent retry, and a circuit breaker that stops
calling for ten minutes after three consecutive failures.

Cover images are the opposite case and load straight from
`covers.openlibrary.org`: lookups by cover id are unmetered and cached for a
century, so proxying them would route every byte through the server for
nothing. Every cover URL carries `?default=false`, because without it a
missing cover answers `200` with a 43-byte transparent GIF, which fires the
image's `load` event and would leave an invisible pixel stretched across the
frame instead of the plate.

Search is submit-driven rather than type-ahead. Open Library's search has been
measured anywhere between 1.5 and 9 seconds for the same shape of query, and it
answers one request at a time — type-ahead would queue a request per keystroke
and deliver the wrong one last.

Metadata is snapshotted into your own record when a book is added and never
re-fetched to render. The library opens instantly, works offline, and does not
change under you because a volunteer edited a catalogue entry.

`OPENLIBRARY_CONTACT` is optional; setting it to an email or URL moves praxis
into Open Library's identified tier.

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

Praxis serves on **http://localhost:3100** — port 3000 is left free for other
local services. The port is set in the `dev` and `start` scripts.

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
| `pnpm dev` | start the development server on port 3100 |
| `pnpm build` | create a production build |
| `pnpm start` | serve the production build on port 3100 |
| `pnpm typecheck` | run `tsc --noEmit` |

## Stack

- Next.js App Router, React 19, and TypeScript
- Tailwind CSS v4 with a CSS-first theme
- Instrument Sans and Instrument Serif through `next/font/google`
- Zustand for optimistic local state and timer resilience
- Supabase Postgres for durable state and integration caches
- Hevy public API, Strava API v3, and the Open Library catalogue

## Project layout

```text
app/
  api/               password, data, books, Hevy, and Strava server routes
  books/             library, one book, reading log, reading insights
  habits/            contribution-based habit tracking
  practice/          session timer
  training/          Hevy and Strava activity
components/
  activity/          reusable contribution grid
  books/             library, book detail, covers, progress stepper
  dashboard/         cross-domain overview
  habits/            habit cards and editor
  training/          workout and activity visualizations
  timer/             practice timer workflow
lib/
  books.ts           reading vocabulary, covers, pace, and rollups
  openlibrary.ts     server-side catalogue search, throttled and fused
  github.ts          server-side GitHub contribution sync
  hevy.ts            server-side Hevy sync
  strava.ts          server-side OAuth refresh and activity sync
  store.ts           local state plus Supabase snapshot model
supabase/migrations/  RLS-protected database schema
```
