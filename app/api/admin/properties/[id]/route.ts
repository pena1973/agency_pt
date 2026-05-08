import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-access";
import { propertyListingSchema } from "@/lib/real-estate/schema";
import { readPropertyListings, writePropertyListings } from "@/lib/real-estate/storage";

type PropertyRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: PropertyRouteContext) {
  try {
    const forbiddenResponse = await requireAdminApiAccess();
    if (forbiddenResponse) return forbiddenResponse;

    const { id } = await context.params;
    const payload = await request.json();
    const property = propertyListingSchema.parse(payload);
    const properties = await readPropertyListings();
    const propertyIndex = properties.findIndex((item) => item.id === id);

    if (propertyIndex === -1) {
      return NextResponse.json({ error: "Объект не найден." }, { status: 404 });
    }

    const duplicateConflict = properties.some(
      (item, index) =>
        index !== propertyIndex &&
        (item.id === property.id || item.slug === property.slug)
    );

    if (duplicateConflict) {
      return NextResponse.json(
        { error: "ID или slug уже используется другим объектом." },
        { status: 409 }
      );
    }

    const nextProperties = [...properties];
    nextProperties[propertyIndex] = property;
    await writePropertyListings(nextProperties);
    const persistedProperties = await readPropertyListings();

    return NextResponse.json({ properties: persistedProperties });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Не удалось сохранить объект." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: PropertyRouteContext) {
  const forbiddenResponse = await requireAdminApiAccess();
  if (forbiddenResponse) return forbiddenResponse;

  const { id } = await context.params;
  const properties = await readPropertyListings();
  const nextProperties = properties.filter((item) => item.id !== id);

  if (nextProperties.length === properties.length) {
    return NextResponse.json({ error: "Объект не найден." }, { status: 404 });
  }

  await writePropertyListings(nextProperties);
  const persistedProperties = await readPropertyListings();
  return NextResponse.json({ properties: persistedProperties });
}
