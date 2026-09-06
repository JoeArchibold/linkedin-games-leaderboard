import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ADMIN_COOKIE, isAdminConfigured, isValidSessionToken } from "@/lib/admin";
import { getPool } from "@/lib/db";
import { listPlayerVisibility } from "@/lib/visibility";
import { setVisibility } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const store = await cookies();
  if (!isValidSessionToken(store.get(ADMIN_COOKIE)?.value)) {
    redirect("/admin/login");
  }
  if (!isAdminConfigured()) {
    redirect("/admin/login");
  }

  const pool = getPool();
  const players = await listPlayerVisibility(pool);

  return (
    <main className="page">
      <h1>Admin — player visibility</h1>
      <p className="empty">
        Players shown here have recorded scores. Only those marked visible appear
        on the public leaderboard (hidden by default).
      </p>
      <Link className="back" href="/">
        ← View leaderboard
      </Link>

      {players.length === 0 ? (
        <p className="empty">No players with recorded scores yet.</p>
      ) : (
        <table className="board">
          <thead>
            <tr>
              <th>Player</th>
              <th>Visible</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.playerId}>
                <td>{p.playerName}</td>
                <td>{p.isVisible ? "Yes" : "No"}</td>
                <td>
                  <form action={setVisibility}>
                    <input type="hidden" name="playerId" value={p.playerId} />
                    <input type="hidden" name="visible" value={String(!p.isVisible)} />
                    <button type="submit">{p.isVisible ? "Hide" : "Show"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
