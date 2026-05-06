import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createInquiryInDb } from "@/lib/db/inquiries";
import type { InquiryMessenger, InquirySource } from "@/lib/real-estate/types";

type InquiryPayload = {
  source?: InquirySource;
  phone?: string;
  messengers?: InquiryMessenger[];
  name?: string;
  email?: string;
  message?: string;
  propertyId?: string;
  propertySlug?: string;
  propertyTitle?: string;
  searchType?: string;
  location?: string;
  areaAndTypology?: string;
  mustHave?: string;
};

function isMessenger(value: string): value is InquiryMessenger {
  return ["whatsapp", "telegram", "viber", "signal"].includes(value);
}

function normalizePayload(payload: InquiryPayload) {
  if (!payload.source || !payload.phone || payload.phone.trim().length === 0) {
    return null;
  }

  const messengers = Array.isArray(payload.messengers)
    ? payload.messengers.filter((item): item is InquiryMessenger => isMessenger(item))
    : [];

  return {
    source: payload.source,
    phone: payload.phone.trim(),
    messengers,
    name: payload.name?.trim() || undefined,
    email: payload.email?.trim().toLowerCase() || undefined,
    message: payload.message?.trim() || undefined,
    propertyId: payload.propertyId?.trim() || undefined,
    propertySlug: payload.propertySlug?.trim() || undefined,
    propertyTitle: payload.propertyTitle?.trim() || undefined,
    searchType: payload.searchType?.trim() || undefined,
    location: payload.location?.trim() || undefined,
    areaAndTypology: payload.areaAndTypology?.trim() || undefined,
    mustHave: payload.mustHave?.trim() || undefined,
  };
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as InquiryPayload;
    const normalized = normalizePayload(payload);

    if (!normalized) {
      return NextResponse.json(
        { error: "Нужно указать телефон и источник обращения." },
        { status: 400 }
      );
    }

    const currentUser = await getCurrentUser();
    const inquiry = await createInquiryInDb({
      ...normalized,
      userId: currentUser?.id,
      email: normalized.email ?? currentUser?.email ?? undefined,
      name: normalized.name ?? currentUser?.name ?? undefined,
    });

    return NextResponse.json({ inquiry }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Не удалось сохранить обращение." },
      { status: 500 }
    );
  }
}
