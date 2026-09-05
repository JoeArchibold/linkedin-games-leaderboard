import { getScoreUnits, isKnownGame } from "./games";
import { parseScore } from "./score";
import type {
  GameEntry,
  IngestPayload,
  LeaderboardEntry,
  NormalizedDay,
  NormalizedGame,
  NormalizedPlayer,
} from "./types";

export class ValidationError extends Error {}

/** Validate/transform a raw POST body into a NormalizedDay for the ingester. */
export function normalizeDay(payload: unknown): NormalizedDay {
  if (!payload || typeof payload !== "object") {
    throw new ValidationError("body must be an object");
  }
  const body = payload as Partial<IngestPayload>;

  const date = body.date;
  if (typeof date !== "string" || !isDateString(date)) {
    throw new ValidationError("date must be a valid YYYY-MM-DD string");
  }

  const games = body.games;
  if (!games || typeof games !== "object" || Array.isArray(games)) {
    throw new ValidationError("games must be an object");
  }
  const entries = Object.entries(games);
  if (entries.length === 0) {
    throw new ValidationError("games must not be empty");
  }

  return { date, games: entries.map(([name, entry]) => normalizeGame(name, entry)) };
}

function normalizeGame(gameName: string, entry: GameEntry | undefined): NormalizedGame {
  if (!isKnownGame(gameName)) {
    throw new ValidationError(`unknown game "${gameName}"`);
  }
  if (!entry || typeof entry !== "object") {
    throw new ValidationError(`game "${gameName}" must be an object`);
  }

  const gameNumber = toNonNegativeInt(entry.number);
  if (gameNumber === null) {
    throw new ValidationError(`game "${gameName}" has an invalid or missing number`);
  }

  return {
    gameName,
    scoreUnits: getScoreUnits(gameName) ?? "seconds",
    gameNumber,
    avgScore: parseScore(gameName, entry.avg ?? null),
    finalized: entry.avg_is_final === true,
    players: normalizePlayers(gameName, entry.leaderboard_fetches),
  };
}

function normalizePlayers(gameName: string, fetches: unknown): NormalizedPlayer[] {
  if (!fetches || typeof fetches !== "object" || Array.isArray(fetches)) return [];

  const players: NormalizedPlayer[] = [];
  for (const [playerName, raw] of Object.entries(fetches)) {
    const trimmed = playerName.trim();
    if (!trimmed) continue;
    const fetch = raw as LeaderboardEntry | null;
    if (!fetch || typeof fetch !== "object") continue;

    // A "-:--" or missing score means the player didn't record one; the score is
    // the data we care about, so the row is excluded rather than stored.
    const score = parseScore(gameName, fetch.score ?? null);
    if (score === null) continue;

    players.push({
      playerName: trimmed,
      score,
      noHints: fetch.no_hints === true,
      noMistakes: fetch.no_mistakes === true,
    });
  }
  return players;
}

function isDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value;
}

function toNonNegativeInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isSafeInteger(n) && n >= 0) return n;
  }
  return null;
}
