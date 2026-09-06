import Link from "next/link";

import RangeNav from "@/components/RangeNav";
import { getPool } from "@/lib/db";
import { formatAverage } from "@/lib/format";
import { addDaysISO, linkedInTodayISO } from "@/lib/date";
import { getDisplayName } from "@/lib/games";
import { getAllTime } from "@/lib/leaderboard";
import { RANGES, resolveRange } from "@/lib/ranges";

export const dynamic = "force-dynamic";

const TOP_N = 5;

export default async function AllTime({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const key = resolveRange(range);
  const days = RANGES[key].days;

  const today = linkedInTodayISO();
  const cutoff = days === null ? null : addDaysISO(today, -(days - 1)); // inclusive window ending today

  const pool = getPool();
  const games = await getAllTime(pool, cutoff, TOP_N);

  return (
    <main className="page">
      <h1>All-time leaderboard</h1>
      <RangeNav basePath="/all-time" active={key} />
      <Link className="back" href="/">
        ← Today
      </Link>

      <div className="games">
        {games.map((g) => (
          <section key={g.game} className="card">
            <h2>
              <Link href={`/all-time/${g.game}?range=${key}`}>{getDisplayName(g.game)}</Link>
            </h2>
            {g.rows.length === 0 ? (
              <p className="empty">No scores in this window.</p>
            ) : (
              <ol className="rows">
                {g.rows.map((r) => (
                  <li key={`${g.game}-${r.playerName}-${r.rank}`}>
                    <span className="place">{r.rank}</span>
                    <span className="name">{r.playerName}</span>
                    <span className="avg">{formatAverage(g.game, r.score)}</span>
                    <span className="count">
                      {r.gamesCount} game{r.gamesCount === 1 ? "" : "s"}
                    </span>
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
