import { getScoreUnits } from "./games";

/** Sentinel used by the collector when a player has not submitted a score. */
const MISSING_SCORE = "-:--";

/**
 * Convert a raw score value from results.json into an integer for storage:
 *  - "count" games keep the number as-is (e.g. Pinpoint guesses)
 *  - every other game is parsed from the (mm:ss) format into total seconds
 * Returns null for missing/absent values ("-:--", empty, non-numeric), which the
 * caller should treat as "no score" (the row is excluded, not stored).
 */
export function parseScore(gameName: string, value: unknown): number | null {
  if (value === null || value === undefined) return null;

  const raw = String(value).trim();
  if (raw === "" || raw === MISSING_SCORE) return null;

  if (getScoreUnits(gameName) === "count") {
    return parseNumeric(raw);
  }

  return parseTimeToSeconds(raw);
}

function parseNumeric(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : null;
}

function parseTimeToSeconds(raw: string): number | null {
  const match = /^(\d+):([0-5]?\d)$/.exec(raw);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  return minutes * 60 + seconds;
}
