import { getScoreUnits } from "./games";

/**
 * Format a stored integer score for display:
 *  - "seconds" games render as `m:ss` (e.g. 84 -> "1:24")
 *  - "count" games render as a plain number (e.g. Pinpoint guesses)
 * `null` (missing score) renders as "-".
 */
export function formatScore(gameName: string, score: number | null): string {
  if (score === null) return "-";
  if (getScoreUnits(gameName) === "count") return String(score);
  const minutes = Math.floor(score / 60);
  const seconds = score % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
