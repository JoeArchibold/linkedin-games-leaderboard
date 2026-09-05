<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# linkedin-games-leaderboard

## What this is

A Next.js app that ingests daily LinkedIn games scores (pulled by a sibling
scraper) into PostgreSQL, to back a leaderboard UI. The front-end is still the
default `create-next-app` page; the shipped work so far is the ingest API + DB
scaffolding.

## Tech stack

- **Next.js 16.3.4** (App Router, React 19, TypeScript, Turbopack). Heed the
  "this is not the Next.js you know" block above — read the docs in
  `node_modules/next/dist/docs/` before writing route/layout/page code.
- **`pg`** (node-postgres) for the database.
- **pnpm** (`packageManager: pnpm@11.25.0`).

## Common commands

```bash
pnpm lint            # eslint
pnpm exec tsc --noEmit
pnpm build
pnpm dev
pnpm start
```

> Windows note: PowerShell may block `pnpm.ps1` (ExecutionPolicy). Invoke via
> `cmd /c "pnpm <args>"`, or call `pnpm.cmd`. The repo currently has no test
> runner.

## Data source

The sibling repo `../linkedin-games-data-collector` (Python + Playwright)
produces `results.json` keyed by ISO date, where each day has a `games` map
keyed by game name. Before posting, the collector's client-side mapper rewrites
the running user's own scores (stored at the game level) into
`leaderboard_fetches`, so the API never reads the game-level `score` /
`no_hints` / `no_mistakes` fields.

## Endpoint: `POST /api/ingest`

Receives one day of results and writes them to Postgres in a single transaction.
Re-posting the same day `upsert`s (adds/changes `player_game_mapping` rows,
refreshes/finalizes `games_by_day` averages) rather than duplicating.

```jsonc
{
  "date": "2026-09-04",
  "games": {
    "zip": {
      "number": "536",                 // -> games_by_day.game_number
      "avg": "0:41",                   // -> avg_score (int seconds)
      "avg_is_final": true,            // -> finalized
      "leaderboard_fetches": {         // -> player_game_mapping rows
        "<player name>": { "score": "0:20", "no_hints": true, "no_mistakes": false }
      }
    }
  }
}
```

Response `200`:
```jsonc
{ "ok": true, "date": "2026-09-04", "ignoredUnknownGames": [], "gamesProcessed": 1, "playersUpserted": 1, "mappingsUpserted": 1 }
```
Errors: `401` (missing/invalid bearer token), `400` (invalid body/date, no known
games, invalid number) and `500` (DB error). Unknown games are skipped and
reported in `ignoredUnknownGames` rather than rejecting the whole request (as
long as ≥1 known game remains).

Auth: the route requires `Authorization: Bearer <token>`, where the token is the
shared secret in the `LEADERBOARD_INGEST_TOKEN` env var (see `src/lib/auth.ts`).
A request without a valid token is rejected with `401`. Fail-closed: if the env
var is unset, **every** request is rejected. The collector sends the token from
its own `LEADERBOARD_API_TOKEN`; keep the two values in sync. The token is
server-side only and is never sent to the browser.

## Module map (`src/lib`)

- `db.ts` — `getPool()`: lazy `pg` Pool from `DATABASE_URL` (+ optional `DB_SSL`).
  Created on first use, so `next build` works without env.
- `auth.ts` — `isValidIngestRequest(request)` / `getIngestToken()`: validates the
  `Authorization: Bearer <token>` header against `LEADERBOARD_INGEST_TOKEN` with
  a constant-time compare. Fail-closed when unset.
- `games.ts` — `GAME_CATALOG` (game name → `scoreUnits: "seconds" | "count"`),
  `isKnownGame`, `getScoreUnits`.
- `score.ts` — `parseScore(gameName, value)`: mm:ss → integer seconds; `count`
  games (pinpoint) kept as-is; `"-:--"`/empty/non-numeric → `null` (not stored).
- `types.ts` — payload + normalized types (`IngestPayload`, `GameEntry`,
  `LeaderboardEntry`, `NormalizeResult`, `NormalizedDay`, `IngestSummary`).
- `normalize.ts` — `normalizeDay(payload)`: validates date/games, skips unknown
  games → `NormalizeResult { day, ignoredUnknownGames }`.
- `ingest.ts` — `ingestDay(pool, day)`: one transaction; upserts `game_defs`,
  `players`, `games_by_day`, `player_game_mapping`.

## Database (`init_db.sql`)

Tables (each upsertable by its natural key):

- `game_defs` — `game_id` (identity), `game_name` **UNIQUE**, `score_units`.
- `players` — `player_id` (identity), `player_name` **UNIQUE**, `external_id`.
- `games_by_day` — PK `(game_id, game_number)`, `date`, `avg_score` (nullable),
  `finalized`, `avg_last_updated` (defaults `now()`).
- `player_game_mapping` — PK `(player_id, game_id, game_number)`, `score`,
  `no_hints`, `no_mistake`, `updated_ts` (defaults `now()`).

View `games_by_day_with_updates` adds `leaderboard_last_updated` =
`max(updated_ts)` over the matching `player_game_mapping` rows.

## Score semantics

- Timed games are stored as **INTEGER seconds** (`"1:24"` → `84`); display as
  `mm:ss`.
- `count` games (pinpoint) are stored as a plain count.
- `"-:--"` / missing → no row is written (the score is the whole point).

## Conventions / gotchas

- `pg` is already on Next's `serverExternalPackages` auto-list — no config needed.
- `avg_last_updated` / `updated_ts` are set to `now()` on write; client does not
  send timestamps.
- Game keys (`zip`, `tango`, `queens`, ...) are used verbatim as
  `game_defs.game_name`. Add a new known game to `GAME_CATALOG` or it will be
  silently skipped (`ignoredUnknownGames`).
- The `gh` CLI is installed but not on PATH: `C:\Program Files\GitHub CLI\gh.exe`.
- `POST /api/ingest` is bearer-token authenticated via the server-only
  `LEADERBOARD_INGEST_TOKEN` env var (never sent to the browser). Set the same
  value in the collector's `LEADERBOARD_API_TOKEN`.
- Setup DB locally and copy `.env` from `.env.example` before running the server.
