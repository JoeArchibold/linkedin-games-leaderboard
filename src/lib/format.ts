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

/**
 * Format a player's *average* score for display. Unlike `formatScore` (which takes
 * integer scores), averages can be fractional: timed games round to whole seconds
 * (`m:ss`); count games show up to one decimal (e.g. `3.4`).
 */
export function formatAverage(gameName: string, avg: number): string {
  if (getScoreUnits(gameName) === "count") {
    return avg % 1 === 0 ? String(avg) : avg.toFixed(1);
  }
  const total = Math.round(avg);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
