# Leaderboard Implementation Plan

This is a working plan for building the public leaderboard UI and the private
admin dashboard for the LinkedIn games app. It lives on the `feat/leaderboard`
branch and is the single source of truth for progress. Features are implemented
in phases and merged into the `development` branch (which later merges into
`main`). Update this file's status checklist as work lands.

## Feature list (from the requirements)

1. **Privacy + admin dashboard** — trusted users log in with a *shared password*
   and choose which players with recorded data are shown on the public leaderboard.
2. **Public main page (daily summary)** — for a given day, show the top few
   scores for each game.
3. **Per-game full leaderboard** — click into a game to see the full day's
   leaderboard.
4. **Day switching** — users can seamlessly change which day's scores they're
   viewing (applies to #2 and #3).
5. **All-time leaderboard** — top players per game by average score, with
   configurable time windows (all time / last 30 days / last week).

## Architectural direction (high level)

- Server-rendered public pages (App Router) reading Postgres through the existing
  lazy `pg` pool (`src/lib/db.ts`). A single client-side router/nav in the
  page shell.
- One place for leaderboard query logic (e.g. `src/lib/leaderboard.ts`) so the
  visibility filter is applied consistently to every public read.
- **Privacy enforced at the DB level**: a per-player visibility flag; every public
  query joins/filters on it. The admin dashboard toggles it.
- **Admin is separate**: a shared-password login (env var) + session cookie
  protecting an admin route group. It is distinct from the bearer-token auth on
  `/api/ingest` and from the public site.

## Phases / milestones

- **Phase A — foundation**: DB visibility flag + migration; leaderboard query
  module; the server-rendered pages (main summary + per-game) with day switching.
  Initially treat all recorded players as visible so the UI can be built/verified
  before the privacy layer exists.
- **Phase B — privacy + admin dashboard**: shared-password admin login + protected
  dashboard; player visibility toggles; wire the public queries to the flag.
- **Phase C — all-time leaderboard**: aggregate queries with a time-window
  parameter; pages for all-time / last 30 days / last week; navigation.
- **Phase D — polish**: date picker / prev-next, navigation links across pages,
  refresh & cache/revalidation semantics, styling.

## Status

- [ ] Phase A — foundation
- [ ] Phase B — privacy + admin dashboard
- [ ] Phase C — all-time leaderboard
- [ ] Phase D — polish

## Open questions / uncertainties

> These are recorded now and will be resolved (with more detail) when we work on
> the relevant feature.

- **Visibility model**: is it per-player globally, or more granular (per game, per
  day)? Which recorded scores count as "recorded" for the public list (any score,
  only finalized days, including the running user's own score)?
- **Ranking semantics**: are `count` games (pinpoint) and timed games handled the
  same way for "top scores"? Ties, and scores of `"-:--"`/null.
- **All-time average**: is it the average of a player's daily averages within the
  window, or an average over raw scores? Are absent days excluded or counted as 0?
  Do we restrict to finalized days only?
- **Admin session/auth**: shared password from an env var; single shared password
  vs per-admin; session cookie expiry/rotation; are admins separate from the
  players being toggled?
- **Refresh/caching**: how public data is revalidated when an admin toggles
  visibility or a new ingest arrives (staleness window).
- **Schema migration**: `init_db.sql` is fresh-install only; existing DBs need a
  migration path for the new visibility column/table.
- **"Top few"": on the main summary, is the count fixed (e.g. top 5) or
  configurable?
- **Date default**: when no `?date=` is given, default to today or to the latest
  available day with data?
- **URL/naming**: `/`, `/game/[slug]`, `/all-time`; how `?date=` and time-window
  params are named.

## Existing pieces used

- `src/lib/db.ts` (pool), `src/lib/games.ts` (catalog/units), `src/lib/score.ts`
  (parse + mm:ss display).
- Tables: `players`, `player_game_mapping`, `games_by_day`, `game_defs`.
