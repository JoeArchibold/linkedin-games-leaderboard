import Link from "next/link";

import DayNav from "@/components/DayNav";
import { getPool } from "@/lib/db";
import { formatScore } from "@/lib/format";
import { linkedInTodayISO, isValidISODate } from "@/lib/date";
import { getDisplayName } from "@/lib/games";
import { getDaySummary } from "@/lib/leaderboard";

// Read the DB on every request so the page reflects the latest ingest and is not
// prerendered at build time (build has no DATABASE_URL).
export const dynamic = "force-dynamic";

const TOP_N = 5;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const today = linkedInTodayISO();
  const selected = isValidISODate(date) ? date : today;

  const pool = getPool();
  const summary = await getDaySummary(pool, selected, TOP_N);

  return (
    <main className="page">
      <h1>Leaderboard</h1>
      <DayNav current={selected} maxDate={today} basePath="/" />

      <div className="games">
        {summary.map((g) => (
          <section key={g.game} className="card">
            <h2>
              <Link href={`/game/${g.game}?date=${selected}`}>
                {getDisplayName(g.game)}
              </Link>
            </h2>
            {g.rows.length === 0 ? (
              <p className="empty">No scores recorded for this day.</p>
            ) : (
              <ol className="rows">
                {g.rows.map((r, i) => (
                  <li key={`${g.game}-${r.playerName}-${i}`}>
                    <span className="place">{r.rank}</span>
                    <span className="name">{r.playerName}</span>
                    {(r.noHints || r.noMistakes) && (
                      <span className="badges">
                        {r.noHints && (
                          <span className="badge" title="No hints">
                            H
                          </span>
                        )}
                        {r.noMistakes && (
                          <span className="badge" title="No mistakes">
                            M
                          </span>
                        )}
                      </span>
                    )}
                    <span className="score">{formatScore(g.game, r.score)}</span>
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
