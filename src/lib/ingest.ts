import type { Pool, PoolClient } from "pg";
import type { IngestSummary, NormalizedDay } from "./types";

/**
 * Write a single day's worth of results into the database in one transaction.
 *
 * Assumes `day` has already been validated/normalized by the caller.
 * Everything upserts idempotently, so re-posting the same day later only
 * adds/changes rows rather than duplicating them.
 */
export async function ingestDay(
  pool: Pool,
  day: NormalizedDay
): Promise<IngestSummary> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const summary = await writeDay(client, day);
    await client.query("COMMIT");
    return summary;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function writeDay(
  client: PoolClient,
  day: NormalizedDay
): Promise<IngestSummary> {
  const gameNames = day.games.map((game) => game.gameName);
  const scoreUnits = day.games.map((game) => game.scoreUnits);

  if (gameNames.length > 0) {
    await ensureGameDefs(client, gameNames, scoreUnits);
  }
  const gameIds = await queryGameIds(client, gameNames);

  const playerNames = uniquePlayers(day);
  if (playerNames.length > 0) {
    await ensurePlayers(client, playerNames);
  }
  const playerIds = await queryPlayerIds(client, playerNames);

  let mappingsUpserted = 0;
  for (const game of day.games) {
    const gameId = gameIds.get(game.gameName);
    if (gameId === undefined) {
      throw new Error(`game_defs missing for game "${game.gameName}"`);
    }

    await upsertGameByDay(client, gameId, game, day.date);

    for (const player of game.players) {
      const playerId = playerIds.get(player.playerName);
      if (playerId === undefined) {
        throw new Error(`players missing for "${player.playerName}"`);
      }
      await upsertPlayerGame(client, playerId, gameId, game.gameNumber, player);
      mappingsUpserted += 1;
    }
  }

  return {
    gamesProcessed: day.games.length,
    playersUpserted: playerNames.length,
    mappingsUpserted,
  };
}

async function ensureGameDefs(
  client: PoolClient,
  gameNames: string[],
  scoreUnits: string[]
): Promise<void> {
  await client.query(
    `INSERT INTO game_defs (game_name, score_units)
     SELECT * FROM unnest($1::text[], $2::text[])
     ON CONFLICT (game_name) DO NOTHING`,
    [gameNames, scoreUnits]
  );
}

async function ensurePlayers(
  client: PoolClient,
  playerNames: string[]
): Promise<void> {
  await client.query(
    `INSERT INTO players (player_name)
     SELECT unnest($1::text[])
     ON CONFLICT (player_name) DO NOTHING`,
    [playerNames]
  );
}

async function queryGameIds(
  client: PoolClient,
  gameNames: string[]
): Promise<Map<string, number>> {
  if (gameNames.length === 0) return new Map();
  const result = await client.query(
    `SELECT game_name AS name, game_id AS id
     FROM game_defs
     WHERE game_name = ANY($1::text[])`,
    [gameNames]
  );
  return new Map(result.rows.map((row) => [row.name as string, Number(row.id)]));
}

async function queryPlayerIds(
  client: PoolClient,
  playerNames: string[]
): Promise<Map<string, number>> {
  if (playerNames.length === 0) return new Map();
  const result = await client.query(
    `SELECT player_name AS name, player_id AS id
     FROM players
     WHERE player_name = ANY($1::text[])`,
    [playerNames]
  );
  return new Map(result.rows.map((row) => [row.name as string, Number(row.id)]));
}

async function upsertGameByDay(
  client: PoolClient,
  gameId: number,
  game: NormalizedDay["games"][number],
  date: string
): Promise<void> {
  await client.query(
    `INSERT INTO games_by_day (game_id, game_number, date, avg_score, finalized, avg_last_updated)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (game_id, game_number)
     DO UPDATE SET avg_score = EXCLUDED.avg_score,
                   finalized = EXCLUDED.finalized,
                   avg_last_updated = now()`,
    [gameId, game.gameNumber, date, game.avgScore, game.finalized]
  );
}

async function upsertPlayerGame(
  client: PoolClient,
  playerId: number,
  gameId: number,
  gameNumber: number,
  player: NormalizedDay["games"][number]["players"][number]
): Promise<void> {
  await client.query(
    `INSERT INTO player_game_mapping
       (player_id, game_id, game_number, score, no_hints, no_mistake, updated_ts)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (player_id, game_id, game_number)
     DO UPDATE SET score = EXCLUDED.score,
                   no_hints = EXCLUDED.no_hints,
                   no_mistake = EXCLUDED.no_mistake,
                   updated_ts = now()`,
    [playerId, gameId, gameNumber, player.score, player.noHints, player.noMistakes]
  );
}

function uniquePlayers(day: NormalizedDay): string[] {
  const set = new Set<string>();
  for (const game of day.games) {
    for (const player of game.players) set.add(player.playerName);
  }
  return [...set];
}
