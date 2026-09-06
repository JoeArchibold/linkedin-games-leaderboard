import Link from "next/link";

import { addDaysISO } from "@/lib/date";

/**
 * Prev/next day links around `current`, appending a `?date=YYYY-MM-DD` query to
 * `basePath` (e.g. "/" or "/game/zip"). "Next" is disabled when on `maxDate`.
 */
export default function DayNav({
  current,
  maxDate,
  basePath,
}: {
  current: string;
  maxDate: string;
  basePath: string;
}) {
  const prev = addDaysISO(current, -1);
  const next = addDaysISO(current, 1);
  const atMax = current >= maxDate;
  const sep = basePath.includes("?") ? "&" : "?";

  return (
    <nav className="day-nav">
      <Link href={`${basePath}${sep}date=${prev}`}>← Prev</Link>
      <span className="day-nav-current">{current}</span>
      {atMax ? <span aria-disabled>Next →</span> : <Link href={`${basePath}${sep}date=${next}`}>Next →</Link>}
    </nav>
  );
}
