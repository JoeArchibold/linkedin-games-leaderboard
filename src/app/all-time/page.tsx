import Link from "next/link";

import { getPool } from "@/lib/db";
import { formatAverage } from "@/lib/format";
import { addDaysISO, isValidISODate, linkedInTodayISO } from "@/lib/date";
import { getDisplayName } from "@/lib/games";
import { getAllTime } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

const TOP_N = 10;

const RANGES: Record<string, { label: string; days: number | null }> = {
  all: { label: "All time", days: null },
  "30d": { label: "Last 30 days", days: 30 },
  "7d": { label: "Last 7 days", days: 7 },
};

export default async function AllTime({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const key = range && RANGES[range] ? range : "all";
  const { label, days } = RANGES[key];

  const today = linkedInTodayISO();
  const cutoff = days === null ? null : addDaysISO(today, -(days - 1)); // inclusive window ending today

  const pool = getPool();
  const games = await getAllTime(pool, cutoff, TOP_N);

  return (
    <main className="page">
      <h1>All-time leaderboard</h1>
      <nav className="day-nav">
        {Object.entries(RANGES).map(([k, r]) => (
          <Link key={k} href={`/all-time?range=${k}`} className={k === key ? "active" : undefined}>
            {r.label}
          </Link>
        ))}
      </nav>
      <Link className="back" href="/">
        ← Today
      </Link>

      <div className="games">
        {games.map((g) => (
          <section key={g.game} className="card">
            <h2>{getDisplayName(g.game)}</h2>
            <p className="empty">
              {label} · minimum {TOP_N} shown
            </p>
            {g.rows.length === 0 ? (
              <p className="empty">No scores in this window.</p>
            ) : (
              <ol className="rows">
                {g.rows.map((r) => (
                  <li key={`${g.game}-${r.playerName}-${r.rank}`}>
                    <span className="place">{r.rank}</span>
                    <span className="name">{r.playerName}</span>
                    <span className="avg">{formatAverage(g.game, r.score)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
