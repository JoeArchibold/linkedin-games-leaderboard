import { timingSafeEqual } from "node:crypto";

/**
 * Shared-secret bearer-token auth for the /api/ingest route.
 *
 * The ingest route accepts writes from a small set of trusted scrapers, so it
 * is protected with a single static token rather than being open to the public
 * internet. The token value lives in the server-only `LEADERBOARD_INGEST_TOKEN`
 * env var (see .env.example); it is never sent to the browser.
 *
 * Read access for the (future) public leaderboard page is a separate, public
 * route and intentionally does not use this helper.
 */

export function getIngestToken(): string | null {
  const token = process.env.LEADERBOARD_INGEST_TOKEN;
  return token && token.trim() ? token.trim() : null;
}

function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Return true when a request carries a valid `Authorization: Bearer <token>`.
 *
 * Fail-closed: if the server token is not configured, no request is accepted,
 * so an unconfigured deployment never silently exposes the write path.
 */
export function isValidIngestRequest(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return false;

  const provided = match[1].trim();
  const expected = getIngestToken();
  if (!expected) return false;

  return constantTimeEqual(provided, expected);
}
