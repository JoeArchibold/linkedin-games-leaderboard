import { notFound } from "next/navigation";

import RangeNav from "@/components/RangeNav";
import { getPool } from "@/lib/db";
import { formatAverage } from "@/lib/format";
import { addDaysISO, linkedInTodayISO } from "@/lib/date";
import { getDisplayName, getScoreUnits, isKnownGame } from "@/lib/games";
import { getAllTimeGame } from "@/lib/leaderboard";
import { RANGES, resolveRange } from "@/lib/ranges";

export const dynamic = "force-dynamic";

const pct = (fraction: number) => `${Math.round(fraction * 100)}%`;

export default async function AllTimeGame({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { slug } = await params;
  if (!isKnownGame(slug)) notFound();

  const { range } = await searchParams;
  const key = resolveRange(range);
  const days = RANGES[key].days;

  const today = linkedInTodayISO();
  const cutoff = days === null ? null : addDaysISO(today, -(days - 1));

  const pool = getPool();
  const rows = await getAllTimeGame(pool, slug, cutoff);

  const isPinpoint = getScoreUnits(slug) === "count"; // count games (pinpoint) never use hints

  return (
    <main className="page">
      <h1>
        {getDisplayName(slug)} — all time
      </h1>
      <RangeNav basePath={`/all-time/${slug}`} active={key} />

      {rows.length === 0 ? (
        <p className="empty">No scores in this window.</p>
      ) : (
        <div className="table-scroll">
          <table className="board">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Avg</th>
              <th>Games</th>
              {!isPinpoint && <th>No hints</th>}
              <th>No mistakes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${slug}-${r.playerName}-${r.rank}`}>
                <td>{r.rank}</td>
                <td>{r.playerName}</td>
                <td>{formatAverage(slug, r.score)}</td>
                <td>{r.gamesCount}</td>
                {!isPinpoint && <td>{pct(r.noHintsPct)}</td>}
                <td>{pct(r.noMistakesPct)}</td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
