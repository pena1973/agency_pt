import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-access";
import {
  deleteInquiryFromDb,
  readInquiriesFromDb,
  updateInquiryStatusInDb,
} from "@/lib/db/inquiries";

export async function GET() {
  const forbiddenResponse = await requireAdminApiAccess();
  if (forbiddenResponse) return forbiddenResponse;

  const inquiries = await readInquiriesFromDb();
  return NextResponse.json({ inquiries });
}

export async function PATCH(request: Request) {
  try {
    const forbiddenResponse = await requireAdminApiAccess();
    if (forbiddenResponse) return forbiddenResponse;

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

export async function DELETE(request: Request) {
  try {
    const forbiddenResponse = await requireAdminApiAccess();
    if (forbiddenResponse) return forbiddenResponse;

    const payload = (await request.json()) as {
      id?: string;
    };

    if (!payload.id) {
      return NextResponse.json(
        { error: "Need inquiry id." },
        { status: 400 }
      );
    }

    const inquiries = await deleteInquiryFromDb(payload.id);
    return NextResponse.json({ inquiries });
  } catch (error) {
    if (error instanceof Error && error.message === "INQUIRY_NOT_FOUND") {
      return NextResponse.json(
        { error: "Inquiry not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Could not delete inquiry." },
      { status: 500 }
    );
  }
}
