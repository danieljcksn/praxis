# praxis

A calm, local-first practice journal for classical guitar — inspired by the
[Monkeytype](https://monkeytype.com) dark aesthetic (flat surfaces, one gold
accent, monospace type, lots of breathing room).

Time your sessions with a precise, reload-safe timer, keep your repertoire,
and watch the days add up.

## Features

- **Practice timer** — timestamp-accurate stopwatch that survives tab switches,
  navigation, and reloads. Pick a focus (repertoire, technique, scales,
  sight-reading, theory, or free play), attach the pieces you're working on, set
  an optional session target, and log notes + a "how did it feel" rating when you
  finish. Keyboard-first: `space` start/pause, `enter` finish, `1`–`6` pick focus.
- **Repertoire** — track pieces with composer, status (backlog → learning →
  polishing → performance → maintenance), difficulty, and notes. Each piece shows
  accumulated time, session count, and when you last touched it. Search, filter,
  sort, and archive.
- **History** — a GitHub/Monkeytype-style activity heatmap plus a per-day session
  log. Edit any session, or log practice you did away from the app.
- **Stats** — total time, weekly trend, current/longest streak, where your time
  goes (by focus), most-practiced pieces, and a by-day-of-week breakdown.
- **Your data stays yours** — everything is stored in your browser
  (`localStorage`). Export a JSON backup any time, import it to restore or move
  devices, load sample data to explore, or clear everything.

## Getting started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

New here? Head to **Settings → Load sample data** to explore with a few months of
example history, then clear it when you're ready to start your own.

## Scripts

| command | what it does |
| --- | --- |
| `npm run dev` | start the dev server |
| `npm run build` | production build |
| `npm run start` | serve the production build |
| `npm run typecheck` | run `tsc --noEmit` |
| `npm run lint` | run Next.js ESLint |

## Stack

- **Next.js** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (CSS-first theme tokens)
- **Zustand** with `persist` for local-first state
- **date-fns**, **lucide-react**, **JetBrains Mono**

## Data & backups

All state lives under the `praxis-store` key in `localStorage`. Because it's
per-browser, it doesn't sync across devices — use **Settings → Export backup**
to keep a copy, and **Import backup** to restore it. Backups are plain JSON.

## Project layout

```
app/                 routes: / (timer), /repertoire, /history, /stats, /settings
components/
  layout/            nav, page header, timer lifecycle
  timer/             timer screen, focus selector, finish dialog
  repertoire/        piece list + editor
  history/           heatmap, session log + editor
  stats/             tiles, trends, donut
  ui/                buttons, modal, fields, toasts, primitives
lib/
  store.ts           zustand store (state + actions + persistence)
  stats.ts           derived data: streaks, heatmap, rollups, breakdowns
  time.ts            duration/date formatting + day keys
  types.ts           domain model
```
