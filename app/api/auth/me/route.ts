import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await getCurrentUser();

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json(
      { error: "Не удалось получить данные пользователя." },
      { status: 500 }
    );
  }
}
