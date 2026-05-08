import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-access";
import { readGenerationUsageSummary } from "@/lib/db/generation-usage";

export const runtime = "nodejs";

export async function GET() {
  try {
    const forbiddenResponse = await requireAdminApiAccess();
    if (forbiddenResponse) return forbiddenResponse;

    return NextResponse.json(readGenerationUsageSummary());
  } catch {
    return NextResponse.json(
      { error: "Не удалось загрузить баланс генераций." },
      { status: 500 }
    );
  }
}
