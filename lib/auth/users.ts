import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createPasswordHash, verifyPassword } from "@/lib/auth/password";
import { getEffectiveUserAccessRole } from "@/lib/auth/admin";

export type AuthResult =
  | {
      success: true;
      user: {
        id: string;
        email: string;
        name: string;
        phone: string | null;
        role: "admin" | "realtor" | "client";
      };
    }
  | {
      success: false;
      error: string;
      field?: "email" | "password" | "general";
    };

function mapUser(row: typeof users.$inferSelect) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone ?? null,
    role: getEffectiveUserAccessRole(row.email, row.role),
  } as const;
}

export async function findUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  return rows[0] ?? null;
}

export async function registerUser(
  email: string,
  password: string
): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    return {
      success: false,
      error: "Пользователь с таким email уже существует.",
      field: "email",
    };
  }

  const createdAt = new Date();
  const userRecord: typeof users.$inferInsert = {
    id: `user-${crypto.randomUUID()}`,
    email: normalizedEmail,
    passwordHash: createPasswordHash(password),
    name: "",
    phone: null,
    role: "client",
    createdAt,
    lastActiveAt: createdAt,
  };

  await db.insert(users).values(userRecord);

  return {
    success: true,
    user: mapUser({
      id: userRecord.id,
      email: userRecord.email,
      passwordHash: userRecord.passwordHash,
      name: userRecord.name ?? "",
      phone: null,
      role: "client",
      createdAt,
      lastActiveAt: createdAt,
    }),
  };
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await findUserByEmail(normalizedEmail);

  if (!existingUser) {
    return {
      success: false,
      error: "Пользователь с таким email не найден.",
      field: "email",
    };
  }

  if (!verifyPassword(password, existingUser.passwordHash)) {
    return {
      success: false,
      error: "Неверный пароль.",
      field: "password",
    };
  }

  await db
    .update(users)
    .set({ lastActiveAt: new Date() })
    .where(eq(users.id, existingUser.id));

  return {
    success: true,
    user: mapUser({
      ...existingUser,
      lastActiveAt: new Date(),
    }),
  };
}
