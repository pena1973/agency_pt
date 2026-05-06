import type { PropertyListing } from "@/lib/real-estate/types";
import { replacePropertyListingsInDb } from "@/lib/db/properties";

export async function syncPropertyListingsToDb(
  listings: PropertyListing[]
): Promise<void> {
  await replacePropertyListingsInDb(listings);
}
