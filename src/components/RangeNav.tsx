import Link from "next/link";

import { RANGES } from "@/lib/ranges";

/** Time-window switcher for the all-time pages (appends ?range=...). */
export default function RangeNav({
  basePath,
  active,
}: {
  basePath: string;
  active: string;
}) {
  const sep = basePath.includes("?") ? "&" : "?";
  return (
    <nav className="day-nav">
      {Object.entries(RANGES).map(([key, range]) => (
        <Link
          key={key}
          href={`${basePath}${sep}range=${key}`}
          className={key === active ? "active" : undefined}
        >
          {range.label}
        </Link>
      ))}
    </nav>
  );
}
