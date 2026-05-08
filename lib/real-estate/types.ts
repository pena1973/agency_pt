export type ListingMode = "sale" | "rent";

export type ListingFeature =
  | "sea_view"
  | "city_center"
  | "parking"
  | "pool"
  | "security"
  | "furnished"
  | "balcony"
  | "terrace";

export type PropertyLocation = {
  addressLabel: string;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
};

export type PropertyCondition =
  | "new_build"
  | "excellent"
  | "good"
  | "needs_renovation";

export type PropertyType =
  | "villa"
  | "apartment"
  | "studio"
  | "room"
  | "penthouse"
  | "townhouse"
  | "loft"
  | "duplex"
  | "land";

export type HeatingType =
  | "central"
  | "underfloor"
  | "electric"
  | "heat_pump"
  | "gas_boiler"
  | "none";

export type EnergyRating =
  | "A+"
  | "A"
  | "B"
  | "B-"
  | "C"
  | "D";

export type TransportMode = "metro" | "bus" | "tram" | "train" | "ferry";

export type TransportRoute = {
  mode: TransportMode;
  route: string;
  stopName: string;
  walkMinutes: number;
};

export type PropertyDetails = {
  propertyType: PropertyType;
  usableAreaM2: number;
  builtAreaM2: number;
  plotAreaM2?: number;
  floor?: string;
  exterior: boolean;
  elevator: boolean;
  parkingSpaces: number;
  storageRoom: boolean;
  builtInWardrobes: boolean;
  equippedKitchen: boolean;
  furnished: boolean;
  balconyCount: number;
  terraceCount: number;
  condition: PropertyCondition;
  yearBuilt: number;
  heating: HeatingType;
  accessibilityAdapted: boolean;
  orientation: string[];
  energyRating: EnergyRating;
  bathroomsFull: number;
  guestBathrooms?: number;
  buildingFloors?: number;
  monthlyCondoFeeEur?: number;
};

export type PropertyTaxProfile = {
  propertyTransferTaxRate: number;
  stampDutyRate: number;
  notaryEstimateRate: number;
};

export type PropertyListing = {
  id: string;
  slug: string;
  isActive?: boolean;
  mode: ListingMode;
  title: string;
  city: string;
  district: string;
  country: string;
  location: PropertyLocation;
  priceAmount: number;
  priceLabel: string;
  shortDescription: string;
  fullDescription: string;
  bedrooms: number;
  bathrooms: number;
  areaM2: number;
  imageUrl: string;
  imageGallery: string[];
  imagePositions?: Record<string, { x: number; y: number }>;
  imageSources?: Record<string, "original" | "ai_generated">;
  features: ListingFeature[];
  details: PropertyDetails;
  transportAccess: TransportRoute[];
  taxProfile?: PropertyTaxProfile;
  agentName: string;
  publishedAt: string;
};

export type InquiryMessenger = "whatsapp" | "telegram" | "viber" | "signal";

export type InquirySource = "catalog_request" | "property_request";

export type CustomerInquiry = {
  id: string;
  createdAt: string;
  status: "new" | "reviewed";
  source: InquirySource;
  userId?: string;
  phone: string;
  messengers: InquiryMessenger[];
  name?: string;
  email?: string;
  message?: string;
  propertyId?: string;
  propertySlug?: string;
  propertyTitle?: string;
  searchType?: string;
  location?: string;
  areaAndTypology?: string;
  mustHave?: string;
  balcony?: boolean;
  terrace?: boolean;
  garageParking?: boolean;
  closedGarage?: boolean;
  nearMetroTransport?: boolean;
  nearSupermarket?: boolean;
};

export type RegisteredUserStatus = "new" | "active" | "archived";

export type RegisteredUserSearchProfile = {
  mode?: ListingMode | "all";
  cities?: string[];
  propertyTypes?: PropertyType[];
  budgetLabel?: string;
  mustHave?: string[];
  notes?: string;
};

export type RegisteredUser = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  messengers?: InquiryMessenger[];
  createdAt: string;
  lastActiveAt: string;
  status: RegisteredUserStatus;
  favoriteIds: string[];
  compareIds: string[];
  lastViewedIds?: string[];
  searchProfile?: RegisteredUserSearchProfile;
};
