import type { Pool } from "pg";

export interface PlayerVisibility {
  playerId: number;
  playerName: string;
  isVisible: boolean;
}

/**
 * List every player who has at least one recorded score, with their current
 * public-leaderboard visibility, ordered by name. Used by the admin dashboard.
 */
export async function listPlayerVisibility(pool: Pool): Promise<PlayerVisibility[]> {
  const res = await pool.query(
    `SELECT p.player_id, p.player_name, p.is_on_public_leaderboard AS is_visible
       FROM players p
      WHERE EXISTS (SELECT 1 FROM player_game_mapping m WHERE m.player_id = p.player_id)
      ORDER BY p.player_name ASC`
  );
  return res.rows.map((r) => ({
    playerId: r.player_id,
    playerName: r.player_name,
    isVisible: r.is_visible,
  }));
}

/** Set whether a player appears on the public leaderboard. */
export async function setPlayerVisibility(
  pool: Pool,
  playerId: number,
  visible: boolean
): Promise<void> {
  await pool.query(
    "UPDATE players SET is_on_public_leaderboard = $2 WHERE player_id = $1",
    [playerId, visible]
  );
}
