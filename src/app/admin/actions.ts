"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_COOKIE, createSessionToken, isValidSessionToken, verifyAdminPassword } from "@/lib/admin";
import { getPool } from "@/lib/db";
import { setPlayerVisibility } from "@/lib/visibility";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, matches the token TTL

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!verifyAdminPassword(password)) {
    redirect("/admin/login?error=1");
  }
  const store = await cookies();
  store.set(ADMIN_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  redirect("/admin");
}

export async function setVisibility(formData: FormData) {
  const store = await cookies();
  if (!isValidSessionToken(store.get(ADMIN_COOKIE)?.value)) return;

  const playerId = Number(formData.get("playerId"));
  const visible = String(formData.get("visible")) === "true";
  if (!Number.isSafeInteger(playerId) || playerId <= 0) return;

  await setPlayerVisibility(getPool(), playerId, visible);
  revalidatePath("/");
  revalidatePath("/admin");
}
