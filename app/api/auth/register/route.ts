import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth/session";
import { registerUser } from "@/lib/auth/users";

type RegisterPayload = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RegisterPayload;
    const email = payload.email?.trim() ?? "";
    const password = payload.password?.trim() ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Укажите email и пароль.", field: "general" },
        { status: 400 }
      );
    }

    const authResult = await registerUser(email, password);

    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error, field: authResult.field ?? "general" },
        { status: 400 }
      );
    }

    await createSession(authResult.user.id, true);

    return NextResponse.json({
      user: authResult.user,
      redirectTo: "/",
    });
  } catch {
    return NextResponse.json(
      { error: "Не удалось завершить регистрацию." },
      { status: 500 }
    );
  }
}
