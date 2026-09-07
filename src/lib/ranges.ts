/** Time windows for the all-time leaderboard. `days: null` = all time. */
export const RANGES: Record<string, { label: string; days: number | null }> = {
  all: { label: "All time", days: null },
  "30d": { label: "Last 30 days", days: 30 },
  "7d": { label: "Last 7 days", days: 7 },
};

/** Normalise a `range` query value to one of the RANGES keys (default "all"). */
export function resolveRange(key: string | undefined): string {
  return key && key in RANGES ? key : "all";
}
