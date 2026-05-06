import crypto from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { inquiries, properties, users } from "@/lib/db/schema";
import type {
  CustomerInquiry,
  InquiryMessenger,
  InquirySource,
} from "@/lib/real-estate/types";

type CreateInquiryInput = {
  source: InquirySource;
  phone: string;
  messengers: InquiryMessenger[];
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
  userId?: string;
};

type InquiryStatus = CustomerInquiry["status"];

function mapMessengers(row: typeof inquiries.$inferSelect): InquiryMessenger[] {
  const nextMessengers: InquiryMessenger[] = [];

  if (row.messengerWhatsapp) nextMessengers.push("whatsapp");
  if (row.messengerTelegram) nextMessengers.push("telegram");
  if (row.messengerViber) nextMessengers.push("viber");
  if (row.messengerSignal) nextMessengers.push("signal");

  return nextMessengers;
}

function mapInquiryRow(
  row: {
    inquiry: typeof inquiries.$inferSelect;
    propertySlug: string | null;
    propertyTitle: string | null;
    userEmail: string | null;
  }
): CustomerInquiry {
  return {
    id: row.inquiry.id,
    createdAt: row.inquiry.createdAt.toISOString(),
    status: row.inquiry.status,
    source: row.inquiry.source,
    userId: row.inquiry.userId ?? undefined,
    phone: row.inquiry.phone,
    messengers: mapMessengers(row.inquiry),
    name: row.inquiry.name ?? undefined,
    email: row.inquiry.email ?? row.userEmail ?? undefined,
    message: row.inquiry.message ?? undefined,
    propertyId:
      row.inquiry.propertyReferenceId ?? row.inquiry.propertyId ?? undefined,
    propertySlug: row.inquiry.propertySlug ?? row.propertySlug ?? undefined,
    propertyTitle: row.inquiry.propertyTitle ?? row.propertyTitle ?? undefined,
    searchType: row.inquiry.searchType ?? undefined,
    location: row.inquiry.location ?? undefined,
    areaAndTypology: row.inquiry.areaAndTypology ?? undefined,
    mustHave: row.inquiry.mustHave ?? undefined,
  };
}

export async function readInquiriesFromDb(): Promise<CustomerInquiry[]> {
  const rows = await db
    .select({
      inquiry: inquiries,
      propertySlug: properties.slug,
      propertyTitle: properties.title,
      userEmail: users.email,
    })
    .from(inquiries)
    .leftJoin(properties, eq(properties.id, inquiries.propertyId))
    .leftJoin(users, eq(users.id, inquiries.userId))
    .orderBy(desc(inquiries.createdAt));

  return rows.map(mapInquiryRow);
}

export async function createInquiryInDb(
  input: CreateInquiryInput
): Promise<CustomerInquiry> {
  const createdAt = new Date();
  const inquiryId = `inq-${crypto.randomUUID()}`;
  let validPropertyId: string | null = null;

  if (input.propertyId) {
    const propertyRows = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.id, input.propertyId))
      .limit(1);

    validPropertyId = propertyRows[0]?.id ?? null;
  }

  await db.insert(inquiries).values({
    id: inquiryId,
    userId: input.userId ?? null,
    propertyId: validPropertyId,
    propertyReferenceId: input.propertyId?.trim() || null,
    propertySlug: input.propertySlug?.trim() || null,
    propertyTitle: input.propertyTitle?.trim() || null,
    source: input.source,
    status: "new",
    name: input.name?.trim() || null,
    email: input.email?.trim().toLowerCase() || null,
    phone: input.phone.trim(),
    message: input.message?.trim() || null,
    searchType: input.searchType?.trim() || null,
    location: input.location?.trim() || null,
    areaAndTypology: input.areaAndTypology?.trim() || null,
    mustHave: input.mustHave?.trim() || null,
    messengerWhatsapp: input.messengers.includes("whatsapp"),
    messengerTelegram: input.messengers.includes("telegram"),
    messengerViber: input.messengers.includes("viber"),
    messengerSignal: input.messengers.includes("signal"),
    createdAt,
  });

  const rows = await db
    .select({
      inquiry: inquiries,
      propertySlug: properties.slug,
      propertyTitle: properties.title,
      userEmail: users.email,
    })
    .from(inquiries)
    .leftJoin(properties, eq(properties.id, inquiries.propertyId))
    .leftJoin(users, eq(users.id, inquiries.userId))
    .where(eq(inquiries.id, inquiryId))
    .limit(1);

  const row = rows[0];

  if (!row) {
    throw new Error("Created inquiry not found");
  }

  return mapInquiryRow(row);
}

export async function updateInquiryStatusInDb(
  inquiryId: string,
  status: InquiryStatus
): Promise<CustomerInquiry[]> {
  const existingRows = await db
    .select({ id: inquiries.id })
    .from(inquiries)
    .where(eq(inquiries.id, inquiryId))
    .limit(1);

  if (existingRows.length === 0) {
    throw new Error("INQUIRY_NOT_FOUND");
  }

  await db
    .update(inquiries)
    .set({ status })
    .where(eq(inquiries.id, inquiryId));

  return readInquiriesFromDb();
}

export async function hasInquiriesInDb(): Promise<boolean> {
  const rows = await db.select({ id: inquiries.id }).from(inquiries).limit(1);
  return rows.length > 0;
}

export async function getInquiryByIdFromDb(
  inquiryId: string
): Promise<CustomerInquiry | null> {
  const rows = await db
    .select({
      inquiry: inquiries,
      propertySlug: properties.slug,
      propertyTitle: properties.title,
      userEmail: users.email,
    })
    .from(inquiries)
    .leftJoin(properties, eq(properties.id, inquiries.propertyId))
    .leftJoin(users, eq(users.id, inquiries.userId))
    .where(eq(inquiries.id, inquiryId))
    .limit(1);

  const row = rows[0];
  return row ? mapInquiryRow(row) : null;
}

export async function findRecentInquiriesByUserId(userId: string) {
  return db
    .select({
      inquiry: inquiries,
      propertySlug: properties.slug,
      propertyTitle: properties.title,
      userEmail: users.email,
    })
    .from(inquiries)
    .leftJoin(properties, eq(properties.id, inquiries.propertyId))
    .leftJoin(users, eq(users.id, inquiries.userId))
    .where(and(eq(inquiries.userId, userId)))
    .orderBy(desc(inquiries.createdAt));
}
