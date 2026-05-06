import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readInquiriesFromDb } from "@/lib/db/inquiries";
import { readPropertyListingsFromDb } from "@/lib/db/properties";
import { readRegisteredUsersFromDb } from "@/lib/db/registered-users";
import { syncPropertyListingsToDb } from "@/lib/db/catalog-sync";
import { propertyListings as defaultPropertyListings } from "@/lib/real-estate/data";
import { customerInquiries as defaultCustomerInquiries } from "@/lib/real-estate/inquiries";
import { registeredUsers as defaultRegisteredUsers } from "@/lib/real-estate/users";
import type {
  CustomerInquiry,
  PropertyListing,
  RegisteredUser,
} from "@/lib/real-estate/types";

const storageDirectory = path.join(process.cwd(), "data", "real-estate");
const storageFilePath = path.join(storageDirectory, "properties.json");
const inquiriesFilePath = path.join(storageDirectory, "inquiries.json");
const usersFilePath = path.join(storageDirectory, "users.json");

function enrichCustomerInquiries(
  inquiries: CustomerInquiry[],
  users: RegisteredUser[]
): CustomerInquiry[] {
  const defaultInquiryById = new Map(
    defaultCustomerInquiries.map((inquiry) => [inquiry.id, inquiry] as const)
  );
  const userById = new Map(users.map((user) => [user.id, user] as const));
  const userByEmail = new Map(
    users.map((user) => [user.email.trim().toLowerCase(), user] as const)
  );

  return inquiries.map((inquiry) => {
    const fallbackInquiry = defaultInquiryById.get(inquiry.id);
    const mergedInquiry: CustomerInquiry = {
      ...(fallbackInquiry ?? {}),
      ...inquiry,
      messengers:
        inquiry.messengers && inquiry.messengers.length > 0
          ? inquiry.messengers
          : fallbackInquiry?.messengers ?? [],
    };

    const inferredUser =
      (mergedInquiry.userId ? userById.get(mergedInquiry.userId) : undefined) ??
      (mergedInquiry.email
        ? userByEmail.get(mergedInquiry.email.trim().toLowerCase())
        : undefined) ??
      (fallbackInquiry?.userId ? userById.get(fallbackInquiry.userId) : undefined) ??
      (fallbackInquiry?.email
        ? userByEmail.get(fallbackInquiry.email.trim().toLowerCase())
        : undefined);

    if (!mergedInquiry.userId && inferredUser) {
      mergedInquiry.userId = inferredUser.id;
    }

    if (!mergedInquiry.email && inferredUser) {
      mergedInquiry.email = inferredUser.email;
    }

    return mergedInquiry;
  });
}

export function isPropertyActive(property: PropertyListing): boolean {
  return property.isActive !== false;
}

export async function readPropertyListings(): Promise<PropertyListing[]> {
  const dbListings = await readPropertyListingsFromDb();

  if (dbListings.length > 0) {
    return dbListings;
  }

  try {
    const fileContents = await readFile(storageFilePath, "utf-8");
    const parsed = JSON.parse(fileContents) as unknown;

    if (!Array.isArray(parsed)) {
      return defaultPropertyListings;
    }

    const listings = parsed as PropertyListing[];
    await syncPropertyListingsToDb(listings);
    return listings;
  } catch {
    await syncPropertyListingsToDb(defaultPropertyListings);
    return defaultPropertyListings;
  }
}

export async function writePropertyListings(
  listings: PropertyListing[]
): Promise<void> {
  await mkdir(storageDirectory, { recursive: true });
  await writeFile(storageFilePath, JSON.stringify(listings, null, 2), "utf-8");
  await syncPropertyListingsToDb(listings);
}

export async function getPropertyBySlugFromStorage(
  slug: string
): Promise<PropertyListing | undefined> {
  const listings = await readPropertyListings();
  return listings.find((property) => isPropertySlugMatch(property, slug));
}

export async function readPublicPropertyListings(): Promise<PropertyListing[]> {
  const listings = await readPropertyListings();
  return listings.filter(isPropertyActive);
}

export async function getPublicPropertyBySlugFromStorage(
  slug: string
): Promise<PropertyListing | undefined> {
  const listings = await readPublicPropertyListings();
  return listings.find((property) => isPropertySlugMatch(property, slug));
}

function getGeneratedIdSlug(id: string): string {
  return id.replace(/^irina-/, "");
}

function isPropertySlugMatch(property: PropertyListing, slug: string): boolean {
  const decodedSlug = decodeURIComponent(slug);
  const generatedIdSlug = getGeneratedIdSlug(property.id);

  return (
    property.slug === decodedSlug ||
    property.id === decodedSlug ||
    generatedIdSlug === decodedSlug ||
    decodedSlug.includes(generatedIdSlug)
  );
}

export async function readCustomerInquiries(): Promise<CustomerInquiry[]> {
  const dbInquiries = await readInquiriesFromDb();
  const users = await readRegisteredUsers();

  if (dbInquiries.length > 0) {
    return enrichCustomerInquiries(dbInquiries, users);
  }

  try {
    const fileContents = await readFile(inquiriesFilePath, "utf-8");
    const parsed = JSON.parse(fileContents) as unknown;

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return enrichCustomerInquiries(defaultCustomerInquiries, users);
    }

    return enrichCustomerInquiries(parsed as CustomerInquiry[], users);
  } catch {
    return enrichCustomerInquiries(defaultCustomerInquiries, defaultRegisteredUsers);
  }
}

export async function writeCustomerInquiries(
  inquiries: CustomerInquiry[]
): Promise<void> {
  await mkdir(storageDirectory, { recursive: true });
  await writeFile(inquiriesFilePath, JSON.stringify(inquiries, null, 2), "utf-8");
}

export async function readRegisteredUsers(): Promise<RegisteredUser[]> {
  const dbUsers = await readRegisteredUsersFromDb();

  if (dbUsers.length > 0) {
    const dbUserByEmail = new Map(
      dbUsers.map((user) => [user.email.trim().toLowerCase(), user] as const)
    );

    const mergedUsers = defaultRegisteredUsers.map((mockUser) => {
      const dbUser = dbUserByEmail.get(mockUser.email.trim().toLowerCase());

      if (!dbUser) {
        return mockUser;
      }

      return {
        ...mockUser,
        ...dbUser,
        favoriteIds: dbUser.favoriteIds.length > 0 ? dbUser.favoriteIds : mockUser.favoriteIds,
        compareIds: dbUser.compareIds.length > 0 ? dbUser.compareIds : mockUser.compareIds,
        searchProfile: dbUser.searchProfile ?? mockUser.searchProfile,
      };
    });

    const mergedUserIds = new Set(mergedUsers.map((user) => user.id));
    const extraDbUsers = dbUsers.filter((user) => !mergedUserIds.has(user.id));

    return [...mergedUsers, ...extraDbUsers];
  }

  try {
    const fileContents = await readFile(usersFilePath, "utf-8");
    const parsed = JSON.parse(fileContents) as unknown;

    if (!Array.isArray(parsed)) {
      return defaultRegisteredUsers;
    }

    return parsed as RegisteredUser[];
  } catch {
    return defaultRegisteredUsers;
  }
}
