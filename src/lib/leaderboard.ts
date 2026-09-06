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
 * Assign competition ranks to rows already sorted best-first (ascending score).
 * Equal scores share a rank and a later distinct score skips the gap, e.g.
 * scores 10,10,12 -> ranks 1,1,3.
 */
export function assignRanks(rows: LeaderboardEntry[]): LeaderboardRow[] {
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
 * Phase A intentionally returns every recorded player (no visibility filter); the
 * `is_on_public_leaderboard` flag is applied in Phase B.
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
