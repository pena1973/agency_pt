import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { propertyListings as defaultPropertyListings } from "@/lib/real-estate/data";
import type { PropertyListing } from "@/lib/real-estate/types";

const storageDirectory = path.join(process.cwd(), "data", "real-estate");
const storageFilePath = path.join(storageDirectory, "properties.json");

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
