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
  | "penthouse"
  | "townhouse"
  | "loft"
  | "duplex";

export type HeatingType =
  | "central"
  | "underfloor"
  | "electric"
  | "heat_pump"
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
  features: ListingFeature[];
  details: PropertyDetails;
  transportAccess: TransportRoute[];
  taxProfile?: PropertyTaxProfile;
  agentName: string;
  publishedAt: string;
};
