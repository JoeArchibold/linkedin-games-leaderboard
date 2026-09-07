/**
 * Hardcoded catalog of known LinkedIn games keyed by the `game_name` used in the
 * collector's results.json. `scoreUnits` describes how the stored integer score
 * should be interpreted/displayed:
 *  - "seconds": the integer is a duration in seconds (format mm:ss for display)
 *  - "count":   the integer is a plain count (e.g. Pinpoint guesses)
 */
export const GAME_CATALOG: Record<string, { scoreUnits: "seconds" | "count" }> = {
  zip: { scoreUnits: "seconds" },
  tango: { scoreUnits: "seconds" },
  queens: { scoreUnits: "seconds" },
  mini_sudoku: { scoreUnits: "seconds" },
  patches: { scoreUnits: "seconds" },
  wend: { scoreUnits: "seconds" },
  crossclimb: { scoreUnits: "seconds" },
  pinpoint: { scoreUnits: "count" },
};

export function isKnownGame(gameName: string): boolean {
  return Object.prototype.hasOwnProperty.call(GAME_CATALOG, gameName);
}

export function getScoreUnits(gameName: string): string | null {
  return GAME_CATALOG[gameName]?.scoreUnits ?? null;
}

/**
 * Human-readable game name: `crossclimb` -> "Crossclimb", `mini_sudoku` ->
 * "Mini Sudoku" (underscores to spaces, each word title-cased).
 */
export function getDisplayName(gameName: string): string {
  return gameName
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}
