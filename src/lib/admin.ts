import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Admin auth for the dashboard. A shared password from the
 * `LEADERBOARD_ADMIN_PASSWORD` env var gates access; logging in issues a
 * stateless, httpOnly cookie that is signed with that same password (HMAC-SHA256)
 * and carries an expiry. No session table, so it survives restarts. The password
 * is never stored in the cookie — only the signed expiry token is.
 */

export const ADMIN_COOKIE = "leaderboard_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function getAdminPassword(): string | null {
  const p = process.env.LEADERBOARD_ADMIN_PASSWORD;
  return p && p.trim() ? p.trim() : null;
}

export function isAdminConfigured(): boolean {
  return getAdminPassword() !== null;
}

export function verifyAdminPassword(password: string): boolean {
  const expected = getAdminPassword();
  if (!expected) return false;
  return constantTimeEqual(password, expected);
}

/** Create a new signed session token (`<expiresAt>.<hmac>`). */
export function createSessionToken(): string {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = String(expires);
  return `${payload}.${sign(payload)}`;
}

export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  if (!isAdminConfigured()) return false; // admin disabled -> no access
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = sign(payload);
  if (expected.length !== signature.length) return false;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  const expires = Number(payload);
  return Number.isFinite(expires) && expires > Math.floor(Date.now() / 1000);
}

function sign(payload: string): string {
  // The password is also the signing key. Changing it invalidates all sessions.
  return createHmac("sha256", getAdminPassword() ?? "").update(payload).digest("hex");
}

function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
