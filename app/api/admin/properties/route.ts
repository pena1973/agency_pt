import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-access";
import { propertyListingSchema, propertyListingsSchema } from "@/lib/real-estate/schema";
import { readPropertyListings, writePropertyListings } from "@/lib/real-estate/storage";

export async function GET() {
  const forbiddenResponse = await requireAdminApiAccess();
  if (forbiddenResponse) return forbiddenResponse;

  const properties = await readPropertyListings();
  return NextResponse.json({ properties });
}

export async function POST(request: Request) {
  const forbiddenResponse = await requireAdminApiAccess();
  if (forbiddenResponse) return forbiddenResponse;

  const payload = await request.json();
  const property = propertyListingSchema.parse(payload);
  const properties = await readPropertyListings();

  if (properties.some((item) => item.id === property.id || item.slug === property.slug)) {
    return NextResponse.json(
      { error: "Объект с таким ID или slug уже существует." },
      { status: 409 }
    );
  }

  const nextProperties = [property, ...properties];
  await writePropertyListings(nextProperties);
  const persistedProperties = await readPropertyListings();

  return NextResponse.json({ properties: persistedProperties }, { status: 201 });
}

export async function PUT(request: Request) {
  const forbiddenResponse = await requireAdminApiAccess();
  if (forbiddenResponse) return forbiddenResponse;

  const payload = await request.json();
  const properties = propertyListingsSchema.parse(payload);
  await writePropertyListings(properties);
  const persistedProperties = await readPropertyListings();

  return NextResponse.json({ properties: persistedProperties });
}
