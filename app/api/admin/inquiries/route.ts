import { NextResponse } from "next/server";
import {
  readCustomerInquiries,
  writeCustomerInquiries,
} from "@/lib/real-estate/storage";

export async function GET() {
  const inquiries = await readCustomerInquiries();
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

    const inquiries = await readCustomerInquiries();
    const inquiryIndex = inquiries.findIndex((item) => item.id === payload.id);

    if (inquiryIndex === -1) {
      return NextResponse.json(
        { error: "Обращение не найдено." },
        { status: 404 }
      );
    }

    const nextInquiries = [...inquiries];
    nextInquiries[inquiryIndex] = {
      ...nextInquiries[inquiryIndex],
      status: payload.status,
    };

    await writeCustomerInquiries(nextInquiries);

    return NextResponse.json({ inquiries: nextInquiries });
  } catch {
    return NextResponse.json(
      { error: "Не удалось обновить статус обращения." },
      { status: 500 }
    );
  }
}
