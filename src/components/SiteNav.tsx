import Link from "next/link";

/** Site-wide header nav for the public pages. `date` preserves the selected day. */
export default function SiteNav({
  date,
  active,
}: {
  date?: string;
  active: "daily" | "alltime";
}) {
  const dailyHref = date ? `/?date=${date}` : "/";
  return (
    <header className="site-nav">
      <Link href="/" className="brand">
        LinkedIn Games
      </Link>
      <nav>
        <Link href={dailyHref} className={active === "daily" ? "active" : undefined}>
          Daily
        </Link>
        <Link href="/all-time" className={active === "alltime" ? "active" : undefined}>
          All-time
        </Link>
      </nav>
    </header>
  );
}
