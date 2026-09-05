import { NextRequest } from "next/server";

import { getPool } from "@/lib/db";
import { ingestDay } from "@/lib/ingest";
import { normalizeDay, ValidationError } from "@/lib/normalize";

export const runtime = "nodejs";

/**
 * POST /api/ingest
 *
 * Receives a single day's worth of LinkedIn games results (the shape produced by
 * the data collector's results.json for one date) and writes it to the database
 * in one transaction. Posting the same day again upserts (adds new player
 * mapping rows and refreshes/finalizes avg scores) rather than duplicating.
 *
 * Body:
 *   {
 *     "date": "2026-09-04",
 *     "games": {
 *       "zip": {
 *         "number": "536",
 *         "avg": "0:41",
 *         "avg_is_final": true,
 *         "leaderboard_fetches": { "<player name>": { score, no_hints, no_mistakes } }
 *       },
 *       "...": {}
 *     }
 *   }
 *
 * Note: the game-level `score`/`no_hints`/`no_mistakes` (the running user's own
 * score) are ignored — the client's mapper is expected to fold them into
 * `leaderboard_fetches` before posting.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  let day;
  try {
    day = normalizeDay(body);
  } catch (error) {
    const message =
      error instanceof ValidationError ? error.message : "invalid payload";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }

  try {
    const summary = await ingestDay(getPool(), day);
    return Response.json({ ok: true, date: day.date, ...summary }, { status: 200 });
  } catch (error) {
    console.error("ingest failed", error);
    return Response.json({ ok: false, error: "internal error" }, { status: 500 });
  }
}
