"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Site-wide header nav (rendered once in the root layout). Derives the active
 * section from the path and preserves the selected `?date=` on the Daily link.
 */
export default function SiteNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const date = params.get("date") ?? undefined;
  const isAllTime = pathname.startsWith("/all-time");
  const dailyHref = date ? `/?date=${date}` : "/";

  return (
    <header className="site-nav">
      <Link href="/" className="brand">
        LinkedIn Games
      </Link>
      <nav>
        <Link href={dailyHref} className={!isAllTime ? "active" : undefined}>
          Daily
        </Link>
        <Link href="/all-time" className={isAllTime ? "active" : undefined}>
          All-time
        </Link>
      </nav>
    </header>
  );
}
