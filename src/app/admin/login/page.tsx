import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ADMIN_COOKIE, isAdminConfigured, isValidSessionToken } from "@/lib/admin";
import { login } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const store = await cookies();
  if (isValidSessionToken(store.get(ADMIN_COOKIE)?.value)) {
    redirect("/admin");
  }

  if (!isAdminConfigured()) {
    return (
      <main className="page">
        <h1>Admin login</h1>
        <p className="empty">
          The admin password is not configured (set <code>LEADERBOARD_ADMIN_PASSWORD</code>).
        </p>
        <Link className="back" href="/">
          ← Back
        </Link>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>Admin login</h1>
      {error && <p className="empty">Incorrect password.</p>}
      <form action={login} className="form">
        <label>
          Password
          <input type="password" name="password" autoFocus required />
        </label>
        <button type="submit">Log in</button>
      </form>
    </main>
  );
}
