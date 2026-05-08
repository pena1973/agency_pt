import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function requireAdminApiAccess() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

export async function requireAdminPageAccess() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    redirect("/");
  }

  return user;
}
