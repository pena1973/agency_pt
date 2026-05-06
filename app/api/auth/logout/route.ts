import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth/session";

export async function POST() {
  try {
    await clearSession();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Не удалось завершить сессию." },
      { status: 500 }
    );
  }
}
