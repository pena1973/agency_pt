import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const userRoles = ["realtor", "client"] as const;
const listingModes = ["sale", "rent"] as const;
const propertyTypes = [
  "apartment",
  "studio",
  "room",
  "villa",
  "townhouse",
  "penthouse",
  "land",
  "duplex",
  "loft",
] as const;
const propertyConditions = [
  "new_build",
  "excellent",
  "good",
  "needs_renovation",
] as const;
const heatingTypes = [
  "central",
  "underfloor",
  "electric",
  "heat_pump",
  "gas_boiler",
  "none",
] as const;
const energyRatings = ["A+", "A", "B", "B-", "C", "D"] as const;
const transportModes = ["metro", "bus", "tram", "train", "ferry"] as const;
const inquirySources = ["catalog_request", "property_request"] as const;
const inquiryStatuses = ["new", "reviewed"] as const;
const imageSourceTypes = ["original", "ai_generated"] as const;
const roomTypes = [
  "bedroom",
  "living_room",
  "kids_room",
  "office",
  "kitchen",
  "bathroom",
  "hall",
  "other",
] as const;
const palettes = ["light", "warm", "dark", "pastel", "scandinavian"] as const;
const aiJobStatuses = ["queued", "processing", "completed", "failed"] as const;
const contentLocales = ["pt", "en", "ru", "uk"] as const;

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull().default(""),
    phone: text("phone"),
    role: text("role", { enum: userRoles }).notNull().default("client"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    lastActiveAt: integer("last_active_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    index("users_role_idx").on(table.role),
  ]
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ]
);

export const properties = sqliteTable(
  "properties",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    mode: text("mode", { enum: listingModes }).notNull(),
    propertyType: text("property_type", { enum: propertyTypes }).notNull(),
    title: text("title").notNull(),
    city: text("city").notNull(),
    district: text("district").notNull().default(""),
    country: text("country").notNull().default("Португалия"),
    address: text("address").notNull(),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    priceAmount: integer("price_amount").notNull().default(0),
    priceLabel: text("price_label").notNull(),
    shortDescription: text("short_description").notNull(),
    fullDescription: text("full_description").notNull(),
    bedrooms: integer("bedrooms").notNull().default(0),
    bathrooms: integer("bathrooms").notNull().default(0),
    areaM2: real("area_m2").notNull().default(0),
    agentName: text("agent_name").notNull().default(""),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),

    hasSeaView: integer("has_sea_view", { mode: "boolean" }).notNull().default(false),
    hasCityCenter: integer("has_city_center", { mode: "boolean" }).notNull().default(false),
    hasParking: integer("has_parking", { mode: "boolean" }).notNull().default(false),
    hasPool: integer("has_pool", { mode: "boolean" }).notNull().default(false),
    hasSecurity: integer("has_security", { mode: "boolean" }).notNull().default(false),
    hasFurnished: integer("has_furnished", { mode: "boolean" }).notNull().default(false),
    hasBalcony: integer("has_balcony", { mode: "boolean" }).notNull().default(false),
    hasTerrace: integer("has_terrace", { mode: "boolean" }).notNull().default(false),
    hasStorageRoom: integer("has_storage_room", { mode: "boolean" }).notNull().default(false),
    hasElevator: integer("has_elevator", { mode: "boolean" }).notNull().default(false),
    hasEquippedKitchen: integer("has_equipped_kitchen", { mode: "boolean" })
      .notNull()
      .default(false),
    hasBuiltInWardrobes: integer("has_built_in_wardrobes", { mode: "boolean" })
      .notNull()
      .default(false),
  },
  (table) => [
    uniqueIndex("properties_slug_unique").on(table.slug),
    index("properties_mode_idx").on(table.mode),
    index("properties_property_type_idx").on(table.propertyType),
    index("properties_city_idx").on(table.city),
    index("properties_is_active_idx").on(table.isActive),
  ]
);

export const propertyDetails = sqliteTable(
  "property_details",
  {
    propertyId: text("property_id")
      .primaryKey()
      .references(() => properties.id, { onDelete: "cascade" }),
    usableAreaM2: real("usable_area_m2"),
    builtAreaM2: real("built_area_m2"),
    bathroomsFull: integer("bathrooms_full"),
    plotAreaM2: real("plot_area_m2"),
    floor: text("floor"),
    buildingFloors: integer("building_floors"),
    parkingSpaces: integer("parking_spaces"),
    balconyCount: integer("balcony_count"),
    terraceCount: integer("terrace_count"),
    yearBuilt: integer("year_built"),
    condition: text("condition", { enum: propertyConditions }),
    heating: text("heating", { enum: heatingTypes }),
    energyRating: text("energy_rating", { enum: energyRatings }),
    orientation: text("orientation"),
    exterior: integer("exterior", { mode: "boolean" }),
    elevator: integer("elevator", { mode: "boolean" }),
    storageRoom: integer("storage_room", { mode: "boolean" }),
    builtInWardrobes: integer("built_in_wardrobes", { mode: "boolean" }),
    equippedKitchen: integer("equipped_kitchen", { mode: "boolean" }),
    furnished: integer("furnished", { mode: "boolean" }),
    accessibilityAdapted: integer("accessibility_adapted", { mode: "boolean" }),
    guestBathrooms: integer("guest_bathrooms"),
    monthlyCondoFeeEur: real("monthly_condo_fee_eur"),
  }
);

export const propertyImages = sqliteTable(
  "property_images",
  {
    id: text("id").primaryKey(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    sourceType: text("source_type", { enum: imageSourceTypes }).notNull().default("original"),
    roomType: text("room_type", { enum: roomTypes }),
    isCover: integer("is_cover", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    positionX: integer("position_x").notNull().default(50),
    positionY: integer("position_y").notNull().default(50),
    scale: integer("scale").notNull().default(100),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("property_images_property_id_idx").on(table.propertyId),
    index("property_images_sort_order_idx").on(table.propertyId, table.sortOrder),
  ]
);

export const propertyTransport = sqliteTable(
  "property_transport",
  {
    id: text("id").primaryKey(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    transportMode: text("transport_mode", { enum: transportModes }).notNull(),
    routeName: text("route_name").notNull(),
    stopName: text("stop_name").notNull(),
    minutesWalk: integer("minutes_walk").notNull().default(0),
  },
  (table) => [index("property_transport_property_id_idx").on(table.propertyId)]
);

export const propertyTaxProfiles = sqliteTable("property_tax_profiles", {
  propertyId: text("property_id")
    .primaryKey()
    .references(() => properties.id, { onDelete: "cascade" }),
  propertyTransferTaxRate: real("property_transfer_tax_rate"),
  stampDutyRate: real("stamp_duty_rate"),
  notaryEstimateRate: real("notary_estimate_rate"),
});

export const propertyTranslations = sqliteTable(
  "property_translations",
  {
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    locale: text("locale", { enum: contentLocales }).notNull(),
    sourceLocale: text("source_locale", { enum: contentLocales }).notNull(),
    title: text("title").notNull().default(""),
    city: text("city").notNull().default(""),
    shortDescription: text("short_description").notNull().default(""),
    fullDescription: text("full_description").notNull().default(""),
    orientation: text("orientation").notNull().default("[]"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.propertyId, table.locale] }),
    index("property_translations_property_id_idx").on(table.propertyId),
  ]
);

export const favorites = sqliteTable(
  "favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.propertyId] }),
    index("favorites_property_id_idx").on(table.propertyId),
  ]
);

export const compareItems = sqliteTable(
  "compare_items",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.propertyId] }),
    index("compare_items_property_id_idx").on(table.propertyId),
  ]
);

export const savedSearches = sqliteTable(
  "saved_searches",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mode: text("mode", { enum: listingModes }),
    city: text("city"),
    propertyType: text("property_type", { enum: propertyTypes }),
    priceFrom: integer("price_from"),
    priceTo: integer("price_to"),
    bedrooms: text("bedrooms"),
    hasSeaView: integer("has_sea_view", { mode: "boolean" }).notNull().default(false),
    hasCityCenter: integer("has_city_center", { mode: "boolean" }).notNull().default(false),
    hasParking: integer("has_parking", { mode: "boolean" }).notNull().default(false),
    hasPool: integer("has_pool", { mode: "boolean" }).notNull().default(false),
    hasSecurity: integer("has_security", { mode: "boolean" }).notNull().default(false),
    hasFurnished: integer("has_furnished", { mode: "boolean" }).notNull().default(false),
    hasBalcony: integer("has_balcony", { mode: "boolean" }).notNull().default(false),
    hasTerrace: integer("has_terrace", { mode: "boolean" }).notNull().default(false),
    hasStorageRoom: integer("has_storage_room", { mode: "boolean" }).notNull().default(false),
    hasElevator: integer("has_elevator", { mode: "boolean" }).notNull().default(false),
    hasEquippedKitchen: integer("has_equipped_kitchen", { mode: "boolean" })
      .notNull()
      .default(false),
    hasBuiltInWardrobes: integer("has_built_in_wardrobes", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("saved_searches_user_id_idx").on(table.userId),
    index("saved_searches_created_at_idx").on(table.createdAt),
  ]
);

export const inquiries = sqliteTable(
  "inquiries",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    propertyId: text("property_id").references(() => properties.id, {
      onDelete: "set null",
    }),
    propertyReferenceId: text("property_reference_id"),
    propertySlug: text("property_slug"),
    propertyTitle: text("property_title"),
    source: text("source", { enum: inquirySources }).notNull(),
    status: text("status", { enum: inquiryStatuses }).notNull().default("new"),
    name: text("name"),
    email: text("email"),
    phone: text("phone").notNull(),
    message: text("message"),
    searchType: text("search_type"),
    location: text("location"),
    areaAndTypology: text("area_and_typology"),
    mustHave: text("must_have"),
    messengerWhatsapp: integer("messenger_whatsapp", { mode: "boolean" })
      .notNull()
      .default(false),
    messengerTelegram: integer("messenger_telegram", { mode: "boolean" })
      .notNull()
      .default(false),
    messengerViber: integer("messenger_viber", { mode: "boolean" }).notNull().default(false),
    messengerSignal: integer("messenger_signal", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("inquiries_status_idx").on(table.status),
    index("inquiries_created_at_idx").on(table.createdAt),
    index("inquiries_user_id_idx").on(table.userId),
    index("inquiries_property_id_idx").on(table.propertyId),
  ]
);

export const adminUploadedPhotos = sqliteTable(
  "admin_uploaded_photos",
  {
    id: text("id").primaryKey(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    fileUrl: text("file_url").notNull(),
    roomType: text("room_type", { enum: roomTypes }),
    selectedForAi: integer("selected_for_ai", { mode: "boolean" }).notNull().default(false),
    selectedForGallery: integer("selected_for_gallery", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("admin_uploaded_photos_property_id_idx").on(table.propertyId)]
);

export const aiGenerationJobs = sqliteTable(
  "ai_generation_jobs",
  {
    id: text("id").primaryKey(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    sourcePhotoId: text("source_photo_id").references(() => adminUploadedPhotos.id, {
      onDelete: "set null",
    }),
    palette: text("palette", { enum: palettes }).notNull(),
    status: text("status", { enum: aiJobStatuses }).notNull().default("queued"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("ai_generation_jobs_property_id_idx").on(table.propertyId),
    index("ai_generation_jobs_source_photo_id_idx").on(table.sourcePhotoId),
  ]
);

export const aiGenerationResults = sqliteTable(
  "ai_generation_results",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => aiGenerationJobs.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    title: text("title"),
    description: text("description"),
    selectedForGallery: integer("selected_for_gallery", { mode: "boolean" })
      .notNull()
      .default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("ai_generation_results_job_id_idx").on(table.jobId)]
);

export type UserRole = (typeof userRoles)[number];
export type ListingMode = (typeof listingModes)[number];
export type PropertyType = (typeof propertyTypes)[number];
export type PropertyCondition = (typeof propertyConditions)[number];
export type HeatingType = (typeof heatingTypes)[number];
export type EnergyRating = (typeof energyRatings)[number];
export type TransportMode = (typeof transportModes)[number];
export type InquirySource = (typeof inquirySources)[number];
export type InquiryStatus = (typeof inquiryStatuses)[number];
export type ImageSourceType = (typeof imageSourceTypes)[number];
export type RoomType = (typeof roomTypes)[number];
export type Palette = (typeof palettes)[number];
export type AiJobStatus = (typeof aiJobStatuses)[number];
export type ContentLocale = (typeof contentLocales)[number];
