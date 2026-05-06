import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  properties,
  propertyDetails,
  propertyImages,
  propertyTaxProfiles,
  propertyTransport,
} from "@/lib/db/schema";
import type {
  ListingFeature,
  PropertyListing,
  TransportRoute,
} from "@/lib/real-estate/types";
import { normalizeCityName } from "@/lib/real-estate/city";
import { DEFAULT_PROPERTY_COVER_URL } from "@/lib/real-estate/property-cover";

function buildMapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

function featureListFromRow(row: typeof properties.$inferSelect): ListingFeature[] {
  const features: ListingFeature[] = [];

  if (row.hasSeaView) features.push("sea_view");
  if (row.hasCityCenter) features.push("city_center");
  if (row.hasParking) features.push("parking");
  if (row.hasPool) features.push("pool");
  if (row.hasSecurity) features.push("security");
  if (row.hasFurnished) features.push("furnished");
  if (row.hasBalcony) features.push("balcony");
  if (row.hasTerrace) features.push("terrace");

  return features;
}

function mapTransportRows(
  rows: Array<typeof propertyTransport.$inferSelect>
): TransportRoute[] {
  return rows.map((row) => ({
    mode: row.transportMode,
    route: row.routeName,
    stopName: row.stopName,
    walkMinutes: row.minutesWalk,
  }));
}

function clampImagePosition(value: number | null | undefined) {
  return Math.min(
    100,
    Math.max(0, typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 50)
  );
}

export async function hasPropertiesInDb(): Promise<boolean> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(properties)
    .limit(1);

  return Number(rows[0]?.count ?? 0) > 0;
}

export async function readPropertyListingsFromDb(): Promise<PropertyListing[]> {
  const propertyRows = await db.select().from(properties).orderBy(desc(properties.createdAt));

  if (propertyRows.length === 0) {
    return [];
  }

  const propertyIds = propertyRows.map((row) => row.id);

  const [detailRows, imageRows, transportRows, taxRows] = await Promise.all([
    db.select().from(propertyDetails).where(inArray(propertyDetails.propertyId, propertyIds)),
    db
      .select()
      .from(propertyImages)
      .where(inArray(propertyImages.propertyId, propertyIds))
      .orderBy(asc(propertyImages.sortOrder), asc(propertyImages.createdAt)),
    db
      .select()
      .from(propertyTransport)
      .where(inArray(propertyTransport.propertyId, propertyIds))
      .orderBy(asc(propertyTransport.routeName)),
    db.select().from(propertyTaxProfiles).where(inArray(propertyTaxProfiles.propertyId, propertyIds)),
  ]);

  const detailsByPropertyId = new Map(detailRows.map((row) => [row.propertyId, row] as const));
  const imagesByPropertyId = new Map<string, Array<typeof propertyImages.$inferSelect>>();
  const transportByPropertyId = new Map<string, Array<typeof propertyTransport.$inferSelect>>();
  const taxByPropertyId = new Map(taxRows.map((row) => [row.propertyId, row] as const));

  for (const row of imageRows) {
    const current = imagesByPropertyId.get(row.propertyId) ?? [];
    current.push(row);
    imagesByPropertyId.set(row.propertyId, current);
  }

  for (const row of transportRows) {
    const current = transportByPropertyId.get(row.propertyId) ?? [];
    current.push(row);
    transportByPropertyId.set(row.propertyId, current);
  }

  return propertyRows.map((row) => {
    const detailRow = detailsByPropertyId.get(row.id);
    const propertyImageRows = imagesByPropertyId.get(row.id) ?? [];
    const coverImage =
      propertyImageRows.find((image) => image.isCover)?.imageUrl ??
      propertyImageRows[0]?.imageUrl ??
      DEFAULT_PROPERTY_COVER_URL;
    const imagePositions = Object.fromEntries(
      propertyImageRows.map((image) => [
        image.imageUrl,
        {
          x: clampImagePosition(image.positionX),
          y: clampImagePosition(image.positionY),
        },
      ])
    );

    return {
      id: row.id,
      slug: row.slug,
      isActive: row.isActive,
      mode: row.mode,
      title: row.title,
      city: normalizeCityName(row.city),
      district: row.district,
      country: row.country,
      location: {
        addressLabel: row.address,
        latitude: row.latitude,
        longitude: row.longitude,
        googleMapsUrl: buildMapsUrl(row.latitude, row.longitude),
      },
      priceAmount: row.priceAmount,
      priceLabel: row.priceLabel,
      shortDescription: row.shortDescription,
      fullDescription: row.fullDescription,
      bedrooms: row.bedrooms,
      bathrooms: detailRow?.bathroomsFull ?? row.bathrooms,
      areaM2: row.areaM2,
      imageUrl: coverImage,
      imageGallery: propertyImageRows.map((image) => image.imageUrl),
      imagePositions,
      features: featureListFromRow(row),
      details: {
        propertyType: row.propertyType,
        usableAreaM2: detailRow?.usableAreaM2 ?? row.areaM2,
        builtAreaM2: detailRow?.builtAreaM2 ?? row.areaM2,
        bathroomsFull: detailRow?.bathroomsFull ?? row.bathrooms,
        plotAreaM2: detailRow?.plotAreaM2 ?? undefined,
        floor: detailRow?.floor ?? undefined,
        exterior: detailRow?.exterior ?? false,
        elevator: detailRow?.elevator ?? false,
        parkingSpaces: detailRow?.parkingSpaces ?? 0,
        storageRoom: detailRow?.storageRoom ?? false,
        builtInWardrobes: detailRow?.builtInWardrobes ?? false,
        equippedKitchen: detailRow?.equippedKitchen ?? false,
        furnished: detailRow?.furnished ?? false,
        balconyCount: detailRow?.balconyCount ?? 0,
        terraceCount: detailRow?.terraceCount ?? 0,
        condition: detailRow?.condition ?? "good",
        yearBuilt: detailRow?.yearBuilt ?? new Date().getFullYear(),
        heating: detailRow?.heating ?? "none",
        accessibilityAdapted: detailRow?.accessibilityAdapted ?? false,
        orientation: detailRow?.orientation
          ? detailRow.orientation.split(",").map((item) => item.trim()).filter(Boolean)
          : [],
        energyRating: detailRow?.energyRating ?? "C",
        guestBathrooms: detailRow?.guestBathrooms ?? undefined,
        buildingFloors: detailRow?.buildingFloors ?? undefined,
        monthlyCondoFeeEur: detailRow?.monthlyCondoFeeEur ?? undefined,
      },
      transportAccess: mapTransportRows(transportByPropertyId.get(row.id) ?? []),
      taxProfile: taxByPropertyId.get(row.id)
        ? {
            propertyTransferTaxRate:
              taxByPropertyId.get(row.id)?.propertyTransferTaxRate ?? 0,
            stampDutyRate: taxByPropertyId.get(row.id)?.stampDutyRate ?? 0,
            notaryEstimateRate: taxByPropertyId.get(row.id)?.notaryEstimateRate ?? 0,
          }
        : undefined,
      agentName: row.agentName,
      publishedAt: (row.publishedAt ?? row.createdAt).toISOString().slice(0, 10),
    };
  });
}

export async function upsertPropertyListingInDb(property: PropertyListing): Promise<void> {
  const now = new Date();
  const city = normalizeCityName(property.city);
  const district = property.district.trim() || city;

  await db
    .insert(properties)
    .values({
      id: property.id,
      slug: property.slug,
      mode: property.mode,
      propertyType: property.details.propertyType,
      title: property.title,
      city,
      district,
      country: property.country,
      address: property.location.addressLabel,
      latitude: property.location.latitude,
      longitude: property.location.longitude,
      priceAmount: property.priceAmount,
      priceLabel: property.priceLabel,
      shortDescription: property.shortDescription,
      fullDescription: property.fullDescription,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      areaM2: property.areaM2,
      agentName: property.agentName,
      isActive: property.isActive !== false,
      publishedAt: property.publishedAt ? new Date(property.publishedAt) : null,
      createdAt: property.publishedAt ? new Date(property.publishedAt) : now,
      updatedAt: now,
      hasSeaView: property.features.includes("sea_view"),
      hasCityCenter: property.features.includes("city_center"),
      hasParking: property.features.includes("parking") || property.details.parkingSpaces > 0,
      hasPool: property.features.includes("pool"),
      hasSecurity: property.features.includes("security"),
      hasFurnished: property.features.includes("furnished") || property.details.furnished,
      hasBalcony: property.features.includes("balcony") || property.details.balconyCount > 0,
      hasTerrace: property.features.includes("terrace") || property.details.terraceCount > 0,
      hasStorageRoom: property.details.storageRoom,
      hasElevator: property.details.elevator,
      hasEquippedKitchen: property.details.equippedKitchen,
      hasBuiltInWardrobes: property.details.builtInWardrobes,
    })
    .onConflictDoUpdate({
      target: properties.id,
      set: {
        slug: property.slug,
        mode: property.mode,
        propertyType: property.details.propertyType,
        title: property.title,
        city,
        district,
        country: property.country,
        address: property.location.addressLabel,
        latitude: property.location.latitude,
        longitude: property.location.longitude,
        priceAmount: property.priceAmount,
        priceLabel: property.priceLabel,
        shortDescription: property.shortDescription,
        fullDescription: property.fullDescription,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        areaM2: property.areaM2,
        agentName: property.agentName,
        isActive: property.isActive !== false,
        publishedAt: property.publishedAt ? new Date(property.publishedAt) : null,
        updatedAt: now,
        hasSeaView: property.features.includes("sea_view"),
        hasCityCenter: property.features.includes("city_center"),
        hasParking: property.features.includes("parking") || property.details.parkingSpaces > 0,
        hasPool: property.features.includes("pool"),
        hasSecurity: property.features.includes("security"),
        hasFurnished: property.features.includes("furnished") || property.details.furnished,
        hasBalcony: property.features.includes("balcony") || property.details.balconyCount > 0,
        hasTerrace: property.features.includes("terrace") || property.details.terraceCount > 0,
        hasStorageRoom: property.details.storageRoom,
        hasElevator: property.details.elevator,
        hasEquippedKitchen: property.details.equippedKitchen,
        hasBuiltInWardrobes: property.details.builtInWardrobes,
      },
    });

  await db
    .insert(propertyDetails)
    .values({
      propertyId: property.id,
      usableAreaM2: property.details.usableAreaM2,
      builtAreaM2: property.details.builtAreaM2,
      bathroomsFull: property.details.bathroomsFull,
      plotAreaM2: property.details.plotAreaM2 ?? null,
      floor: property.details.floor ?? null,
      buildingFloors: property.details.buildingFloors ?? null,
      parkingSpaces: property.details.parkingSpaces,
      balconyCount: property.details.balconyCount,
      terraceCount: property.details.terraceCount,
      yearBuilt: property.details.yearBuilt,
      condition: property.details.condition,
      heating: property.details.heating,
      energyRating: property.details.energyRating,
      orientation: property.details.orientation.join(", "),
      exterior: property.details.exterior,
      elevator: property.details.elevator,
      storageRoom: property.details.storageRoom,
      builtInWardrobes: property.details.builtInWardrobes,
      equippedKitchen: property.details.equippedKitchen,
      furnished: property.details.furnished,
      accessibilityAdapted: property.details.accessibilityAdapted,
      guestBathrooms: property.details.guestBathrooms ?? null,
      monthlyCondoFeeEur: property.details.monthlyCondoFeeEur ?? null,
    })
    .onConflictDoUpdate({
      target: propertyDetails.propertyId,
      set: {
        usableAreaM2: property.details.usableAreaM2,
        builtAreaM2: property.details.builtAreaM2,
        bathroomsFull: property.details.bathroomsFull,
        plotAreaM2: property.details.plotAreaM2 ?? null,
        floor: property.details.floor ?? null,
        buildingFloors: property.details.buildingFloors ?? null,
        parkingSpaces: property.details.parkingSpaces,
        balconyCount: property.details.balconyCount,
        terraceCount: property.details.terraceCount,
        yearBuilt: property.details.yearBuilt,
        condition: property.details.condition,
        heating: property.details.heating,
        energyRating: property.details.energyRating,
        orientation: property.details.orientation.join(", "),
        exterior: property.details.exterior,
        elevator: property.details.elevator,
        storageRoom: property.details.storageRoom,
        builtInWardrobes: property.details.builtInWardrobes,
        equippedKitchen: property.details.equippedKitchen,
        furnished: property.details.furnished,
        accessibilityAdapted: property.details.accessibilityAdapted,
        guestBathrooms: property.details.guestBathrooms ?? null,
        monthlyCondoFeeEur: property.details.monthlyCondoFeeEur ?? null,
      },
    });

  await db.delete(propertyImages).where(eq(propertyImages.propertyId, property.id));

  const coverImageUrl = property.imageGallery.includes(property.imageUrl)
    ? property.imageUrl
    : property.imageGallery[0];
  const propertyImageValues = property.imageGallery.map((imageUrl, index) => ({
      id: `${property.id}-image-${index + 1}`,
      propertyId: property.id,
      imageUrl,
      sourceType: imageUrl.includes("/generated/") ? ("ai_generated" as const) : ("original" as const),
      roomType: null,
      isCover: imageUrl === coverImageUrl,
      sortOrder: index,
      positionX: clampImagePosition(property.imagePositions?.[imageUrl]?.x),
      positionY: clampImagePosition(property.imagePositions?.[imageUrl]?.y),
      createdAt: now,
    }));

  if (propertyImageValues.length > 0) {
    await db.insert(propertyImages).values(propertyImageValues);
  }

  await db.delete(propertyTransport).where(eq(propertyTransport.propertyId, property.id));

  if (property.transportAccess.length > 0) {
    await db.insert(propertyTransport).values(
      property.transportAccess.map((transport, index) => ({
        id: `${property.id}-transport-${index + 1}`,
        propertyId: property.id,
        transportMode: transport.mode,
        routeName: transport.route,
        stopName: transport.stopName,
        minutesWalk: transport.walkMinutes,
      }))
    );
  }

  await db.delete(propertyTaxProfiles).where(eq(propertyTaxProfiles.propertyId, property.id));

  if (property.taxProfile) {
    await db.insert(propertyTaxProfiles).values({
      propertyId: property.id,
      propertyTransferTaxRate: property.taxProfile.propertyTransferTaxRate,
      stampDutyRate: property.taxProfile.stampDutyRate,
      notaryEstimateRate: property.taxProfile.notaryEstimateRate,
    });
  }
}

export async function replacePropertyListingsInDb(listings: PropertyListing[]): Promise<void> {
  const currentRows = await db.select({ id: properties.id }).from(properties);
  const nextIds = new Set(listings.map((listing) => listing.id));

  for (const row of currentRows) {
    if (!nextIds.has(row.id)) {
      await deletePropertyListingFromDb(row.id);
    }
  }

  for (const listing of listings) {
    await upsertPropertyListingInDb(listing);
  }
}

export async function deletePropertyListingFromDb(id: string): Promise<void> {
  await db.delete(properties).where(eq(properties.id, id));
}

export async function getPropertyListingByIdFromDb(id: string): Promise<PropertyListing | null> {
  const rows = await readPropertyListingsFromDb();
  return rows.find((row) => row.id === id) ?? null;
}

export async function slugExistsInDb(slug: string, excludeId?: string): Promise<boolean> {
  const rows = await db
    .select({ id: properties.id })
    .from(properties)
    .where(
      excludeId
        ? and(eq(properties.slug, slug), sql`${properties.id} != ${excludeId}`)
        : eq(properties.slug, slug)
    )
    .limit(1);

  return rows.length > 0;
}
