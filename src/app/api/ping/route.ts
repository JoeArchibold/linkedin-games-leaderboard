import { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/ping
 *
 * Unauthenticated liveness check for verifying public network routing (e.g. a
 * Cloudflare tunnel -> container) end to end. It hits no database and no other
 * service, so a 200 here means the network path and the app process are up.
 */
export async function GET(_request: NextRequest) {
  return Response.json({ ok: true, time: new Date().toISOString() });
}
