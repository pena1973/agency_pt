import { dbEnv } from "@/lib/db/env";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  return normalizeEmail(email) === normalizeEmail(dbEnv.ADMIN_EMAIL);
}

export function getEffectiveUserAccessRole<
  TStoredRole extends "realtor" | "client",
>(email: string | null | undefined, role: TStoredRole): TStoredRole | "admin" {
  if (isAdminEmail(email)) {
    return "admin";
  }

  return role;
}
