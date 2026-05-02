import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
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
  try {
    const fileContents = await readFile(storageFilePath, "utf-8");
    const parsed = JSON.parse(fileContents) as unknown;

    if (!Array.isArray(parsed)) {
      return defaultPropertyListings;
    }

    return parsed as PropertyListing[];
  } catch {
    return defaultPropertyListings;
  }
}

export async function writePropertyListings(
  listings: PropertyListing[]
): Promise<void> {
  await mkdir(storageDirectory, { recursive: true });
  await writeFile(storageFilePath, JSON.stringify(listings, null, 2), "utf-8");
}

export async function getPropertyBySlugFromStorage(
  slug: string
): Promise<PropertyListing | undefined> {
  const listings = await readPropertyListings();
  return listings.find((property) => property.slug === slug);
}

export async function readPublicPropertyListings(): Promise<PropertyListing[]> {
  const listings = await readPropertyListings();
  return listings.filter(isPropertyActive);
}

export async function getPublicPropertyBySlugFromStorage(
  slug: string
): Promise<PropertyListing | undefined> {
  const listings = await readPublicPropertyListings();
  return listings.find((property) => property.slug === slug);
}

export async function readCustomerInquiries(): Promise<CustomerInquiry[]> {
  try {
    const fileContents = await readFile(inquiriesFilePath, "utf-8");
    const parsed = JSON.parse(fileContents) as unknown;
    const users = await readRegisteredUsers();

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
