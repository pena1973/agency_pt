import crypto from "node:crypto";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  compareItems,
  favorites,
  properties,
  savedSearches,
} from "@/lib/db/schema";
import { normalizeCityName } from "@/lib/real-estate/city";
import type { ListingFeature, PropertyType } from "@/lib/real-estate/types";

export type SearchPreferencesPayload = {
  mode?: "sale" | "rent";
  city?: string;
  propertyType?: PropertyType;
  priceFrom?: number;
  priceTo?: number;
  bedrooms?: string;
  features?: Array<
    | ListingFeature
    | "storageRoom"
    | "elevator"
    | "equippedKitchen"
    | "builtInWardrobes"
  >;
};

export type UserPreferencesSnapshot = {
  favoriteIds: string[];
  compareIds: string[];
  searchProfile?: SearchPreferencesPayload;
};

function uniqueIds(ids: string[], maxItems?: number): string[] {
  const nextIds = Array.from(new Set(ids.filter((value) => typeof value === "string")));
  return typeof maxItems === "number" ? nextIds.slice(0, maxItems) : nextIds;
}

async function filterExistingPropertyIds(ids: string[], maxItems?: number): Promise<string[]> {
  const nextIds = uniqueIds(ids, maxItems);

  if (nextIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({ id: properties.id })
    .from(properties)
    .where(inArray(properties.id, nextIds));
  const existingIds = new Set(rows.map((row) => row.id));

  return nextIds.filter((id) => existingIds.has(id));
}

function mapSavedSearch(row: typeof savedSearches.$inferSelect | undefined) {
  if (!row) {
    return undefined;
  }

  const features: NonNullable<SearchPreferencesPayload["features"]> = [];

  if (row.hasSeaView) features.push("sea_view");
  if (row.hasCityCenter) features.push("city_center");
  if (row.hasParking) features.push("parking");
  if (row.hasPool) features.push("pool");
  if (row.hasSecurity) features.push("security");
  if (row.hasFurnished) features.push("furnished");
  if (row.hasBalcony) features.push("balcony");
  if (row.hasTerrace) features.push("terrace");
  if (row.hasStorageRoom) features.push("storageRoom");
  if (row.hasElevator) features.push("elevator");
  if (row.hasEquippedKitchen) features.push("equippedKitchen");
  if (row.hasBuiltInWardrobes) features.push("builtInWardrobes");

  return {
    mode: row.mode ?? undefined,
    city: row.city ? normalizeCityName(row.city, "") : undefined,
    propertyType: row.propertyType ?? undefined,
    priceFrom: row.priceFrom ?? undefined,
    priceTo: row.priceTo ?? undefined,
    bedrooms: row.bedrooms ?? undefined,
    features: features.length > 0 ? features : undefined,
  } satisfies SearchPreferencesPayload;
}

function normalizeSearchProfile(
  searchProfile: SearchPreferencesPayload
): SearchPreferencesPayload {
  const priceFrom =
    typeof searchProfile.priceFrom === "number" && Number.isFinite(searchProfile.priceFrom)
      ? Math.max(0, searchProfile.priceFrom)
      : undefined;
  const priceTo =
    typeof searchProfile.priceTo === "number" && Number.isFinite(searchProfile.priceTo)
      ? Math.max(0, searchProfile.priceTo)
      : undefined;
  const normalizedPrice =
    typeof priceFrom === "number" && typeof priceTo === "number" && priceFrom > priceTo
      ? { priceFrom: priceTo, priceTo: priceFrom }
      : { priceFrom, priceTo };

  return {
    mode: searchProfile.mode,
    city:
      searchProfile.city && searchProfile.city !== "all"
        ? normalizeCityName(searchProfile.city, "")
        : undefined,
    propertyType: searchProfile.propertyType,
    priceFrom: normalizedPrice.priceFrom,
    priceTo: normalizedPrice.priceTo,
    bedrooms:
      searchProfile.bedrooms && searchProfile.bedrooms !== "all"
        ? searchProfile.bedrooms
        : undefined,
    features: Array.isArray(searchProfile.features)
      ? Array.from(new Set(searchProfile.features))
      : undefined,
  };
}

export async function readUserPreferencesFromDb(
  userId: string
): Promise<UserPreferencesSnapshot> {
  const [favoriteRows, compareRows, savedSearchRows] = await Promise.all([
    db.select().from(favorites).where(eq(favorites.userId, userId)),
    db.select().from(compareItems).where(eq(compareItems.userId, userId)),
    db
      .select()
      .from(savedSearches)
      .where(eq(savedSearches.userId, userId))
      .orderBy(desc(savedSearches.createdAt))
      .limit(1),
  ]);

  return {
    favoriteIds: favoriteRows.map((row) => row.propertyId),
    compareIds: compareRows.map((row) => row.propertyId),
    searchProfile: mapSavedSearch(savedSearchRows[0]),
  };
}

export async function replaceFavoritesInDb(
  userId: string,
  favoriteIds: string[]
): Promise<string[]> {
  const nextIds = await filterExistingPropertyIds(favoriteIds);

  await db.delete(favorites).where(eq(favorites.userId, userId));

  if (nextIds.length > 0) {
    await db.insert(favorites).values(
      nextIds.map((propertyId) => ({
        userId,
        propertyId,
        createdAt: new Date(),
      }))
    );
  }

  return nextIds;
}

export async function replaceCompareItemsInDb(
  userId: string,
  compareIds: string[]
): Promise<string[]> {
  const nextIds = await filterExistingPropertyIds(compareIds, 4);

  await db.delete(compareItems).where(eq(compareItems.userId, userId));

  if (nextIds.length > 0) {
    await db.insert(compareItems).values(
      nextIds.map((propertyId) => ({
        userId,
        propertyId,
        createdAt: new Date(),
      }))
    );
  }

  return nextIds;
}

export async function saveSearchProfileInDb(
  userId: string,
  searchProfile: SearchPreferencesPayload
): Promise<SearchPreferencesPayload> {
  const nextSearchProfile = normalizeSearchProfile(searchProfile);
  const features = nextSearchProfile.features ?? [];

  await db.insert(savedSearches).values({
    id: `saved-search-${crypto.randomUUID()}`,
    userId,
    mode: nextSearchProfile.mode ?? null,
    city: nextSearchProfile.city ?? null,
    propertyType: nextSearchProfile.propertyType ?? null,
    priceFrom: nextSearchProfile.priceFrom ?? null,
    priceTo: nextSearchProfile.priceTo ?? null,
    bedrooms: nextSearchProfile.bedrooms ?? null,
    hasSeaView: features.includes("sea_view"),
    hasCityCenter: features.includes("city_center"),
    hasParking: features.includes("parking"),
    hasPool: features.includes("pool"),
    hasSecurity: features.includes("security"),
    hasFurnished: features.includes("furnished"),
    hasBalcony: features.includes("balcony"),
    hasTerrace: features.includes("terrace"),
    hasStorageRoom: features.includes("storageRoom"),
    hasElevator: features.includes("elevator"),
    hasEquippedKitchen: features.includes("equippedKitchen"),
    hasBuiltInWardrobes: features.includes("builtInWardrobes"),
    createdAt: new Date(),
  });

  return nextSearchProfile;
}
