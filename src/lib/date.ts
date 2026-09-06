/** LinkedIn games reset at midnight Pacific time. */
const LINKEDIN_TZ = "America/Los_Angeles";

/** Today's date in LinkedIn's time zone as `YYYY-MM-DD`. */
export function linkedInTodayISO(): string {
  const y = new Date().toLocaleString("en-CA", { timeZone: LINKEDIN_TZ, year: "numeric" });
  const m = new Date().toLocaleString("en-CA", { timeZone: LINKEDIN_TZ, month: "2-digit" });
  const d = new Date().toLocaleString("en-CA", { timeZone: LINKEDIN_TZ, day: "2-digit" });
  return `${y}-${m}-${d}`;
}

/** Add (or subtract) whole days to a `YYYY-MM-DD` string, returning `YYYY-MM-DD`. */
export function addDaysISO(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

/** True when `value` is a real, calendar-valid `YYYY-MM-DD` date. */
export function isValidISODate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}
