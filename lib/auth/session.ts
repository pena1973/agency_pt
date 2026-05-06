import crypto from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { getEffectiveUserAccessRole } from "@/lib/auth/admin";

export const SESSION_COOKIE_NAME = "irina_session";

const DAY_IN_SECONDS = 60 * 60 * 24;
const SHORT_SESSION_DAYS = 1;
const LONG_SESSION_DAYS = 30;

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: "admin" | "realtor" | "client";
  createdAt: Date;
  lastActiveAt: Date | null;
};

function getSessionLifetimeSeconds(rememberMe: boolean): number {
  return (rememberMe ? LONG_SESSION_DAYS : SHORT_SESSION_DAYS) * DAY_IN_SECONDS;
}

function mapAuthenticatedUser(
  row: typeof users.$inferSelect
): AuthenticatedUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone ?? null,
    role: getEffectiveUserAccessRole(row.email, row.role),
    createdAt: row.createdAt,
    lastActiveAt: row.lastActiveAt ?? null,
  };
}

export async function createSession(
  userId: string,
  rememberMe: boolean
): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + getSessionLifetimeSeconds(rememberMe) * 1000
  );

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
    createdAt: new Date(),
    ip: null,
    userAgent: null,
  });

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: getSessionLifetimeSeconds(rememberMe),
  });

  return sessionId;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return null;
  }

  const sessionRows = await db
    .select({
      user: users,
      sessionId: sessions.id,
      sessionUserId: sessions.userId,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const sessionRow = sessionRows[0];

  if (!sessionRow) {
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  await db
    .update(users)
    .set({ lastActiveAt: new Date() })
    .where(eq(users.id, sessionRow.user.id));

  return mapAuthenticatedUser({
    ...sessionRow.user,
    lastActiveAt: new Date(),
  });
}
