/** Shape of an incoming leaderboard fetch for a single player. */
export interface LeaderboardEntry {
  score?: unknown;
  no_hints?: boolean;
  no_mistakes?: boolean;
}

/**
 * Shape of a single game during a day in results.json.
 *
 * The game-level `score`/`no_hints`/`no_mistakes` fields hold the scores of the
 * person running the collector. Those are intentionally ignored here: the
 * collector's client-side mapper rewrites them into `leaderboard_fetches`
 * before posting, so the API only reads leaderboard_fetches for mapping rows.
 */
export interface GameEntry {
  number?: unknown;
  avg?: unknown;
  avg_is_final?: boolean;
  leaderboard_fetches?: Record<string, LeaderboardEntry>;
}

/** Raw POST body for POST /api/ingest. */
export interface IngestPayload {
  date?: unknown;
  day_of_week?: unknown;
  games?: Record<string, GameEntry>;
}

export interface NormalizedPlayer {
  playerName: string;
  score: number;
  noHints: boolean;
  noMistakes: boolean;
}

export interface NormalizedGame {
  gameName: string;
  scoreUnits: string;
  gameNumber: number;
  avgScore: number | null;
  finalized: boolean;
  players: NormalizedPlayer[];
}

export interface NormalizedDay {
  date: string;
  games: NormalizedGame[];
}

export interface IngestSummary {
  gamesProcessed: number;
  playersUpserted: number;
  mappingsUpserted: number;
}
