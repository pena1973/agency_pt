import { z } from "zod";

export const listingFeatureSchema = z.enum([
  "sea_view",
  "city_center",
  "parking",
  "pool",
  "security",
  "furnished",
  "balcony",
  "terrace",
]);

export const listingModeSchema = z.enum(["sale", "rent"]);
export const propertyConditionSchema = z.enum([
  "new_build",
  "excellent",
  "good",
  "needs_renovation",
]);
export const propertyTypeSchema = z.enum([
  "villa",
  "apartment",
  "penthouse",
  "townhouse",
  "loft",
  "duplex",
  "land",
]);
export const heatingTypeSchema = z.enum([
  "central",
  "underfloor",
  "electric",
  "heat_pump",
  "none",
]);
export const energyRatingSchema = z.enum(["A+", "A", "B", "B-", "C", "D"]);
export const transportModeSchema = z.enum([
  "metro",
  "bus",
  "tram",
  "train",
  "ferry",
]);

export const propertyListingSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  mode: listingModeSchema,
  title: z.string().min(1),
  city: z.string().min(1),
  district: z.string().min(1),
  country: z.string().min(1),
  location: z.object({
    addressLabel: z.string().min(1),
    latitude: z.number(),
    longitude: z.number(),
    googleMapsUrl: z.string().url(),
  }),
  priceAmount: z.number().nonnegative(),
  priceLabel: z.string().min(1),
  shortDescription: z.string().min(1),
  fullDescription: z.string().min(1),
  bedrooms: z.number().int().nonnegative(),
  bathrooms: z.number().int().nonnegative(),
  areaM2: z.number().nonnegative(),
  imageUrl: z.string().url(),
  imageGallery: z.array(z.string().url()).min(1),
  features: z.array(listingFeatureSchema),
  details: z.object({
    propertyType: propertyTypeSchema,
    usableAreaM2: z.number().nonnegative(),
    builtAreaM2: z.number().nonnegative(),
    plotAreaM2: z.number().nonnegative().optional(),
    floor: z.string().optional(),
    exterior: z.boolean(),
    elevator: z.boolean(),
    parkingSpaces: z.number().int().nonnegative(),
    storageRoom: z.boolean(),
    builtInWardrobes: z.boolean(),
    equippedKitchen: z.boolean(),
    furnished: z.boolean(),
    balconyCount: z.number().int().nonnegative(),
    terraceCount: z.number().int().nonnegative(),
    condition: propertyConditionSchema,
    yearBuilt: z.number().int().nonnegative(),
    heating: heatingTypeSchema,
    accessibilityAdapted: z.boolean(),
    orientation: z.array(z.string().min(1)),
    energyRating: energyRatingSchema,
    bathroomsFull: z.number().int().nonnegative(),
    guestBathrooms: z.number().int().nonnegative().optional(),
    buildingFloors: z.number().int().nonnegative().optional(),
    monthlyCondoFeeEur: z.number().nonnegative().optional(),
  }),
  transportAccess: z.array(
    z.object({
      mode: transportModeSchema,
      route: z.string().min(1),
      stopName: z.string().min(1),
      walkMinutes: z.number().int().nonnegative(),
    })
  ),
  taxProfile: z
    .object({
      propertyTransferTaxRate: z.number().nonnegative(),
      stampDutyRate: z.number().nonnegative(),
      notaryEstimateRate: z.number().nonnegative(),
    })
    .optional(),
  agentName: z.string().min(1),
  publishedAt: z.string().min(1),
});

export const propertyListingsSchema = z.array(propertyListingSchema);
