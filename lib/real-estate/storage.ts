import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { propertyListings as defaultPropertyListings } from "@/lib/real-estate/data";
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

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as CustomerInquiry[];
  } catch {
    return [];
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
