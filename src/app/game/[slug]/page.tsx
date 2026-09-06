import Link from "next/link";
import { notFound } from "next/navigation";

import DayNav from "@/components/DayNav";
import { getPool } from "@/lib/db";
import { formatScore } from "@/lib/format";
import { linkedInTodayISO, isValidISODate } from "@/lib/date";
import { getDisplayName, isKnownGame } from "@/lib/games";
import { getGameDay } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { slug } = await params;
  if (!isKnownGame(slug)) notFound();

  const { date } = await searchParams;
  const today = linkedInTodayISO();
  const selected = isValidISODate(date) ? date : today;

  const pool = getPool();
  const rows = await getGameDay(pool, slug, selected);

  return (
    <main className="page">
      <h1>
        {getDisplayName(slug)} — {selected}
      </h1>
      <DayNav current={selected} maxDate={today} basePath={`/game/${slug}`} />
      <Link className="back" href={`/?date=${selected}`}>
        ← All games
      </Link>

      {rows.length === 0 ? (
        <p className="empty">No scores recorded for this day.</p>
      ) : (
        <table className="board">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Score</th>
              <th>No hints</th>
              <th>No mistakes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${slug}-${r.playerName}-${i}`}>
                <td>{i + 1}</td>
                <td>{r.playerName}</td>
                <td>{formatScore(slug, r.score)}</td>
                <td>{r.noHints ? "✓" : ""}</td>
                <td>{r.noMistakes ? "✓" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
