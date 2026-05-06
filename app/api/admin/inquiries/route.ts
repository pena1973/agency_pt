import { NextResponse } from "next/server";
import {
  readInquiriesFromDb,
  updateInquiryStatusInDb,
} from "@/lib/db/inquiries";

export async function GET() {
  const inquiries = await readInquiriesFromDb();
  return NextResponse.json({ inquiries });
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as {
      id?: string;
      status?: "new" | "reviewed";
    };

    if (!payload.id || !payload.status) {
      return NextResponse.json(
        { error: "Нужно указать id обращения и новый статус." },
        { status: 400 }
      );
    }

    const inquiries = await updateInquiryStatusInDb(payload.id, payload.status);
    return NextResponse.json({ inquiries });
  } catch (error) {
    if (error instanceof Error && error.message === "INQUIRY_NOT_FOUND") {
      return NextResponse.json(
        { error: "Обращение не найдено." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Не удалось обновить статус обращения." },
      { status: 500 }
    );
  }
}
