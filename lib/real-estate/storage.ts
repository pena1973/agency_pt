import { readInquiriesFromDb } from "@/lib/db/inquiries";
import { readPropertyListingsFromDb } from "@/lib/db/properties";
import { readRegisteredUsersFromDb } from "@/lib/db/registered-users";
import { syncPropertyListingsToDb } from "@/lib/db/catalog-sync";
import type {
  CustomerInquiry,
  PropertyListing,
  RegisteredUser,
} from "@/lib/real-estate/types";

function enrichCustomerInquiries(
  inquiries: CustomerInquiry[],
  users: RegisteredUser[]
): CustomerInquiry[] {
  const userById = new Map(users.map((user) => [user.id, user] as const));
  const userByEmail = new Map(
    users.map((user) => [user.email.trim().toLowerCase(), user] as const)
  );

  return inquiries.map((inquiry) => {
    const mergedInquiry: CustomerInquiry = {
      ...inquiry,
      messengers: inquiry.messengers ?? [],
    };

    const inferredUser =
      (mergedInquiry.userId ? userById.get(mergedInquiry.userId) : undefined) ??
      (mergedInquiry.email
        ? userByEmail.get(mergedInquiry.email.trim().toLowerCase())
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
  return readPropertyListingsFromDb();
}

export async function writePropertyListings(
  listings: PropertyListing[]
): Promise<void> {
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

  return enrichCustomerInquiries(dbInquiries, users);
}

export async function readRegisteredUsers(): Promise<RegisteredUser[]> {
  return readRegisteredUsersFromDb();
}
