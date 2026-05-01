import { NextResponse } from "next/server";
import {
  readCustomerInquiries,
  writeCustomerInquiries,
} from "@/lib/real-estate/storage";
import type {
  CustomerInquiry,
  InquiryMessenger,
  InquirySource,
} from "@/lib/real-estate/types";

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
  balcony?: boolean;
  terrace?: boolean;
  garageParking?: boolean;
  closedGarage?: boolean;
  nearMetroTransport?: boolean;
  nearSupermarket?: boolean;
};

function isMessenger(value: string): value is InquiryMessenger {
  return ["whatsapp", "telegram", "viber", "signal"].includes(value);
}

function normalizePayload(payload: InquiryPayload): Omit<CustomerInquiry, "id" | "createdAt" | "status"> | null {
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
    email: payload.email?.trim() || undefined,
    message: payload.message?.trim() || undefined,
    propertyId: payload.propertyId?.trim() || undefined,
    propertySlug: payload.propertySlug?.trim() || undefined,
    propertyTitle: payload.propertyTitle?.trim() || undefined,
    searchType: payload.searchType?.trim() || undefined,
    location: payload.location?.trim() || undefined,
    areaAndTypology: payload.areaAndTypology?.trim() || undefined,
    mustHave: payload.mustHave?.trim() || undefined,
    balcony: Boolean(payload.balcony),
    terrace: Boolean(payload.terrace),
    garageParking: Boolean(payload.garageParking),
    closedGarage: Boolean(payload.closedGarage),
    nearMetroTransport: Boolean(payload.nearMetroTransport),
    nearSupermarket: Boolean(payload.nearSupermarket),
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

    const currentInquiries = await readCustomerInquiries();
    const nextInquiry: CustomerInquiry = {
      id: `inquiry-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "new",
      ...normalized,
    };

    await writeCustomerInquiries([nextInquiry, ...currentInquiries]);

    return NextResponse.json({ inquiry: nextInquiry }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Не удалось сохранить обращение." },
      { status: 500 }
    );
  }
}
