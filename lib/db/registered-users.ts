import { desc, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  compareItems,
  favorites,
  inquiries,
  savedSearches,
  users,
} from "@/lib/db/schema";
import { normalizeCityName } from "@/lib/real-estate/city";
import type { RegisteredUser, RegisteredUserSearchProfile } from "@/lib/real-estate/types";

function formatEuroAmount(amount: number) {
  return new Intl.NumberFormat("ru-RU").format(amount);
}

function formatBudgetLabel(priceFrom: number | null, priceTo: number | null) {
  if (priceFrom !== null && priceTo !== null) {
    return `${formatEuroAmount(priceFrom)} - ${formatEuroAmount(priceTo)} €`;
  }

  if (priceFrom !== null) {
    return `от ${formatEuroAmount(priceFrom)} €`;
  }

  if (priceTo !== null) {
    return `до ${formatEuroAmount(priceTo)} €`;
  }

  return undefined;
}

function mapSavedSearchProfile(
  row: typeof savedSearches.$inferSelect | undefined
): RegisteredUserSearchProfile | undefined {
  if (!row) {
    return undefined;
  }

  const mustHave: string[] = [];
  if (row.hasSeaView) mustHave.push("Вид на море");
  if (row.hasCityCenter) mustHave.push("Центр города");
  if (row.hasParking) mustHave.push("Паркинг");
  if (row.hasPool) mustHave.push("Бассейн");
  if (row.hasSecurity) mustHave.push("Охрана");
  if (row.hasFurnished) mustHave.push("С мебелью");
  if (row.hasBalcony) mustHave.push("Балкон");
  if (row.hasTerrace) mustHave.push("Терраса");
  if (row.hasStorageRoom) mustHave.push("Кладовая");
  if (row.hasElevator) mustHave.push("Лифт");
  if (row.hasEquippedKitchen) mustHave.push("Обор. кухня");
  if (row.hasBuiltInWardrobes) mustHave.push("Встр. шкафы");

  const budgetLabel = formatBudgetLabel(row.priceFrom, row.priceTo);

  return {
    mode: row.mode ?? undefined,
    cities: row.city ? [normalizeCityName(row.city, "")] : undefined,
    propertyTypes: row.propertyType ? [row.propertyType] : undefined,
    budgetLabel,
    mustHave: mustHave.length > 0 ? mustHave : undefined,
  };
}

function isMeaningfulSavedSearch(row: typeof savedSearches.$inferSelect) {
  return Boolean(
    row.mode === "rent" ||
      row.city ||
      row.propertyType ||
      typeof row.priceFrom === "number" ||
      typeof row.priceTo === "number" ||
      row.bedrooms ||
      row.hasSeaView ||
      row.hasCityCenter ||
      row.hasParking ||
      row.hasPool ||
      row.hasSecurity ||
      row.hasFurnished ||
      row.hasBalcony ||
      row.hasTerrace ||
      row.hasStorageRoom ||
      row.hasElevator ||
      row.hasEquippedKitchen ||
      row.hasBuiltInWardrobes
  );
}

export async function readRegisteredUsersFromDb(): Promise<RegisteredUser[]> {
  const dbUsers = await db.select().from(users).orderBy(desc(users.createdAt));

  if (dbUsers.length === 0) {
    return [];
  }

  const userIds = dbUsers.map((user) => user.id);

  const [favoriteRows, compareRows, latestSavedSearchRows, latestInquiryRows] = await Promise.all([
    db.select().from(favorites).where(inArray(favorites.userId, userIds)),
    db.select().from(compareItems).where(inArray(compareItems.userId, userIds)),
    db
      .select()
      .from(savedSearches)
      .where(inArray(savedSearches.userId, userIds))
      .orderBy(desc(savedSearches.createdAt)),
    db
      .select()
      .from(inquiries)
      .where(inArray(inquiries.userId, userIds))
      .orderBy(desc(inquiries.createdAt)),
  ]);

  const favoritesByUserId = new Map<string, string[]>();
  for (const row of favoriteRows) {
    const current = favoritesByUserId.get(row.userId) ?? [];
    current.push(row.propertyId);
    favoritesByUserId.set(row.userId, current);
  }

  const compareByUserId = new Map<string, string[]>();
  for (const row of compareRows) {
    const current = compareByUserId.get(row.userId) ?? [];
    current.push(row.propertyId);
    compareByUserId.set(row.userId, current);
  }

  const latestSavedSearchByUserId = new Map<string, typeof savedSearches.$inferSelect>();
  for (const row of latestSavedSearchRows) {
    if (!latestSavedSearchByUserId.has(row.userId) && isMeaningfulSavedSearch(row)) {
      latestSavedSearchByUserId.set(row.userId, row);
    }
  }

  const latestInquiryByUserId = new Map<string, typeof inquiries.$inferSelect>();
  for (const row of latestInquiryRows) {
    if (row.userId && !latestInquiryByUserId.has(row.userId)) {
      latestInquiryByUserId.set(row.userId, row);
    }
  }

  return dbUsers.map((user) => {
    const latestSavedSearch = latestSavedSearchByUserId.get(user.id);
    const latestInquiry = latestInquiryByUserId.get(user.id);
    const inferredProfile = mapSavedSearchProfile(latestSavedSearch);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone ?? undefined,
      createdAt: user.createdAt.toISOString(),
      lastActiveAt: (user.lastActiveAt ?? user.createdAt).toISOString(),
      status: latestInquiry ? "active" : "new",
      favoriteIds: favoritesByUserId.get(user.id) ?? [],
      compareIds: compareByUserId.get(user.id) ?? [],
      searchProfile:
        inferredProfile ??
        (latestInquiry
          ? {
              mode: undefined,
              cities: latestInquiry.location ? [latestInquiry.location] : undefined,
              propertyTypes: undefined,
              budgetLabel: undefined,
              mustHave: latestInquiry.mustHave ? [latestInquiry.mustHave] : undefined,
              notes: latestInquiry.message ?? undefined,
            }
          : undefined),
    };
  });
}
