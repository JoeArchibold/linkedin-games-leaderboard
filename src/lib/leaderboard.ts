import type { Pool } from "pg";

import { GAME_CATALOG } from "./games";

export interface LeaderboardEntry {
  playerName: string;
  score: number;
  noHints: boolean;
  noMistakes: boolean;
}

/** A leaderboard entry with its competition rank (sorted best-first). */
export type LeaderboardRow = LeaderboardEntry & { rank: number };

/**
 * Assign competition ranks to rows already sorted best-first (ascending `score`).
 * Equal scores share a rank and a later distinct score skips the gap, e.g.
 * scores 10,10,12 -> ranks 1,1,3. Works for any row type carrying a numeric
 * `score` (e.g. integer daily scores or all-time averages).
 */
export function assignRanks<T extends { score: number }>(rows: T[]): (T & { rank: number })[] {
  let rank = 0;
  let prevScore: number | null = null;
  return rows.map((row, index) => {
    if (prevScore === null || row.score !== prevScore) {
      rank = index + 1;
      prevScore = row.score;
    }
    return { ...row, rank };
  });
}

export interface GameSummary {
  game: string;
  rows: LeaderboardRow[];
}

/**
 * Return the top `topN` scores per known game for a given date, in catalog order.
 *
 * Only players whose `is_on_public_leaderboard` flag is true are shown (admins
 * opt them in via the dashboard).
 *
 * Scores are stored as integers, ordered ascending — lower is better for both
 * timed games (mm:ss -> seconds) and count games (fewer guesses is better).
 */
export async function getDaySummary(
  pool: Pool,
  dateISO: string,
  topN: number
): Promise<GameSummary[]> {
  const gameKeys = Object.keys(GAME_CATALOG);
  const res = await pool.query(
    `SELECT g.game_name AS game,
            p.player_name AS player,
            m.score,
            m.no_hints,
            m.no_mistake
       FROM games_by_day gd
       JOIN game_defs g      ON g.game_id  = gd.game_id
       JOIN player_game_mapping m ON m.game_id = gd.game_id AND m.game_number = gd.game_number
       JOIN players p        ON p.player_id = m.player_id
      WHERE gd.date = $1
        AND g.game_name = ANY($2::text[])
        AND p.is_on_public_leaderboard = TRUE
      ORDER BY g.game_name, m.score ASC`,
    [dateISO, gameKeys]
  );

  const byGame = new Map<string, LeaderboardEntry[]>();
  for (const row of res.rows) {
    const list = byGame.get(row.game) ?? [];
    list.push({
      playerName: row.player,
      score: row.score,
      noHints: row.no_hints,
      noMistakes: row.no_mistake,
    });
    byGame.set(row.game, list);
  }

  return gameKeys.map((game) => {
    const ranked = assignRanks(byGame.get(game) ?? []);
    // Include all rows sharing the Nth rank so a tie at the cutoff isn't truncated.
    return { game, rows: ranked.filter((row) => row.rank <= topN) };
  });
}

/** Return every recorded score for one game on a date, ordered best-first. */
export async function getGameDay(
  pool: Pool,
  gameName: string,
  dateISO: string
): Promise<LeaderboardRow[]> {
  const res = await pool.query(
    `SELECT p.player_name AS player,
            m.score,
            m.no_hints,
            m.no_mistake
       FROM games_by_day gd
       JOIN game_defs g      ON g.game_id  = gd.game_id
       JOIN player_game_mapping m ON m.game_id = gd.game_id AND m.game_number = gd.game_number
       JOIN players p        ON p.player_id = m.player_id
      WHERE gd.date = $1
        AND g.game_name = $2
        AND p.is_on_public_leaderboard = TRUE
      ORDER BY m.score ASC`,
    [dateISO, gameName]
  );

  return assignRanks(
    res.rows.map((r) => ({
      playerName: r.player,
      score: r.score,
      noHints: r.no_hints,
      noMistakes: r.no_mistake,
    }))
  );
}

/** A player's all-time average for a game (`score` is the average). */
export interface AllTimeRow {
  playerName: string;
  score: number;
  gamesCount: number;
  rank: number;
}

export interface AllTimeGame {
  game: string;
  rows: AllTimeRow[];
}

/**
 * Top `topN` players per game by average score, for visible players only.
 * `cutoffISO` (inclusive) limits the window; `null` = all time. The average is
 * over the games a player actually recorded (absent days are skipped), so a
 * player who played once can top the list.
 */
export async function getAllTime(
  pool: Pool,
  cutoffISO: string | null,
  topN: number
): Promise<AllTimeGame[]> {
  const gameKeys = Object.keys(GAME_CATALOG);
  const res = await pool.query(
    `SELECT g.game_name AS game,
            p.player_name AS player,
            AVG(m.score)::numeric AS avg,
            COUNT(m.score)::int AS games
       FROM player_game_mapping m
       JOIN games_by_day gd ON gd.game_id = m.game_id AND gd.game_number = m.game_number
       JOIN game_defs g     ON g.game_id = gd.game_id
       JOIN players p       ON p.player_id = m.player_id
      WHERE p.is_on_public_leaderboard = TRUE
        AND g.game_name = ANY($1::text[])
        AND ($2::date IS NULL OR gd.date >= $2::date)
      GROUP BY g.game_name, p.player_name
      ORDER BY g.game_name, AVG(m.score) ASC`,
    [gameKeys, cutoffISO]
  );

  const byGame = new Map<string, AllTimeRow[]>();
  for (const row of res.rows) {
    const list = byGame.get(row.game) ?? [];
    list.push({ playerName: row.player, score: Number(row.avg), gamesCount: Number(row.games), rank: 0 });
    byGame.set(row.game, list);
  }

  return gameKeys.map((game) => {
    const ranked = assignRanks(byGame.get(game) ?? []);
    return { game, rows: ranked.filter((row) => row.rank <= topN) };
  });
}

/** A player's all-time average for a game, with hint/mistake percentages. */
export interface AllTimePlayerRow extends AllTimeRow {
  /** Fraction (0..1) of this player's games in the window with no hints. */
  noHintsPct: number;
  /** Fraction (0..1) of this player's games in the window with no mistakes. */
  noMistakesPct: number;
}

/**
 * Every visible player's average (and hint/mistake %) for ONE game over a window.
 * `cutoffISO` (inclusive) limits the window; `null` = all time. Pinpoint games
 * never use hints, so the caller omits the no-hints % for them.
 */
export async function getAllTimeGame(
  pool: Pool,
  gameName: string,
  cutoffISO: string | null
): Promise<AllTimePlayerRow[]> {
  const res = await pool.query(
    `SELECT p.player_name AS player,
            AVG(m.score)::numeric AS avg,
            COUNT(*)::int AS games,
            (COUNT(*) FILTER (WHERE m.no_hints))::numeric / COUNT(*)::numeric AS no_hints_pct,
            (COUNT(*) FILTER (WHERE m.no_mistake))::numeric / COUNT(*)::numeric AS no_mistakes_pct
       FROM player_game_mapping m
       JOIN games_by_day gd ON gd.game_id = m.game_id AND gd.game_number = m.game_number
       JOIN game_defs g     ON g.game_id = gd.game_id
       JOIN players p       ON p.player_id = m.player_id
      WHERE p.is_on_public_leaderboard = TRUE
        AND g.game_name = $1
        AND ($2::date IS NULL OR gd.date >= $2::date)
      GROUP BY p.player_name
      ORDER BY AVG(m.score) ASC`,
    [gameName, cutoffISO]
  );

  return assignRanks(
    res.rows.map((r) => ({
      playerName: r.player,
      score: Number(r.avg),
      gamesCount: Number(r.games),
      noHintsPct: Number(r.no_hints_pct),
      noMistakesPct: Number(r.no_mistakes_pct),
    }))
  );
}
