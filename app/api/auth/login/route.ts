import { NextResponse } from "next/server";
import { authenticateUser } from "@/lib/auth/users";
import { createSession } from "@/lib/auth/session";

type LoginPayload = {
  email?: string;
  password?: string;
  rememberMe?: boolean;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as LoginPayload;
    const email = payload.email?.trim() ?? "";
    const password = payload.password?.trim() ?? "";
    const rememberMe = payload.rememberMe !== false;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Укажите email и пароль.", field: "general" },
        { status: 400 }
      );
    }

    const authResult = await authenticateUser(email, password);

    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error, field: authResult.field ?? "general" },
        { status: 400 }
      );
    }

    await createSession(authResult.user.id, rememberMe);

    return NextResponse.json({
      user: authResult.user,
      redirectTo: authResult.user.role === "admin" ? "/admin" : "/",
    });
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json(
      { error: "Не удалось выполнить вход." },
      { status: 500 }
    );
  }
}
