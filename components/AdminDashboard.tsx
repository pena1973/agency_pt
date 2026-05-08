"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChangeEvent, DragEvent, PointerEvent } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  DEFAULT_PROPERTY_COVER_URL,
  getPropertyImagePosition,
} from "@/lib/real-estate/property-cover";
import { normalizeCityName } from "@/lib/real-estate/city";
import type {
  CustomerInquiry,
  EnergyRating,
  HeatingType,
  ListingFeature,
  PropertyCondition,
  PropertyListing,
  PropertyType,
  RegisteredUser,
  TransportMode,
} from "@/lib/real-estate/types";
import type { GenerateRoomDesignResult, RoomType } from "@/lib/room-ai/types";

type AdminDashboardProps = {
  initialProperties: PropertyListing[];
  initialInquiries: CustomerInquiry[];
  initialUsers: RegisteredUser[];
};

type AdminTab = "catalog" | "inquiries" | "users";
type AdminCatalogModeFilter = "all" | PropertyListing["mode"];
type PendingLeaveAction =
  | { kind: "select"; property: PropertyListing }
  | { kind: "create" };

type UploadedAdminPhoto = {
  id: string;
  file: File;
  name: string;
  previewUrl: string;
  selectedForAi: boolean;
  roomType: RoomType;
};

type AiSourcePhoto = {
  id: string;
  imageUrl: string;
  name: string;
  roomType: RoomType;
};

type AdminSpareGalleryItem = {
  id: string;
  imageUrl: string;
  title: string;
  source: "upload" | "ai";
  createdAt: string;
};

type GalleryDragSource = "main" | "spare" | "ai-result" | "gif-result";
type CollapsibleAdminSection = "property" | "photos" | "ai" | "gif";
type GifImageSlot = "start" | "finish";

type GenerationBalance = {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalImages: number;
  totalCostUsd: number;
  entriesCount: number;
};

const roomTypeOptions: Array<{ value: RoomType; label: string }> = [
  { value: "bedroom", label: "Спальня" },
  { value: "living_room", label: "Гостиная" },
  { value: "kids_room", label: "Детская" },
  { value: "office", label: "Кабинет" },
  { value: "kitchen", label: "Кухня" },
];

const paletteOptions = [
  { value: "light", label: "Светлая" },
  { value: "warm", label: "Теплая" },
  { value: "dark", label: "Темная" },
  { value: "pastel", label: "Пастельная" },
  { value: "scandinavian", label: "Скандинавская" },
] as const;

const extendedPropertyTypeOptions: Array<{ value: PropertyType; label: string }> = [
  { value: "apartment", label: "Квартира" },
  { value: "duplex", label: "Дуплекс" },
  { value: "land", label: "Участок" },
  { value: "loft", label: "Лофт" },
  { value: "penthouse", label: "Пентхаус" },
  { value: "room", label: "Комната" },
  { value: "studio", label: "Студия" },
  { value: "townhouse", label: "Таунхаус" },
  { value: "villa", label: "Вилла" },
];

const propertyConditionOptions: Array<{
  value: PropertyCondition;
  label: string;
}> = [
  { value: "new_build", label: "Новостройка" },
  { value: "excellent", label: "В отличном состоянии" },
  { value: "good", label: "Хорошее состояние" },
  { value: "needs_renovation", label: "Нужен ремонт" },
];

type FeatureOption =
  | {
      source: "feature";
      value: ListingFeature;
      label: string;
      compactLabel?: string;
    }
  | {
      source: "detail";
      value:
        | "storageRoom"
        | "elevator"
        | "equippedKitchen"
        | "builtInWardrobes";
      label: string;
      compactLabel?: string;
    };

const listingFeatureOptions: FeatureOption[] = [
  { source: "feature", value: "sea_view", label: "Вид на море", compactLabel: "Вид на море" },
  { source: "feature", value: "city_center", label: "Центр города", compactLabel: "Центр" },
  { source: "feature", value: "parking", label: "Паркинг", compactLabel: "Общ. паркинг" },
  { source: "feature", value: "pool", label: "Бассейн", compactLabel: "Бассейн" },
  { source: "feature", value: "security", label: "Охраняемая территория", compactLabel: "Охрана" },
  { source: "feature", value: "furnished", label: "С мебелью", compactLabel: "Мебель" },
  { source: "feature", value: "balcony", label: "Балкон", compactLabel: "Балкон" },
  { source: "feature", value: "terrace", label: "Терраса", compactLabel: "Терраса" },
  { source: "detail", value: "storageRoom", label: "Кладовая", compactLabel: "Кладовая" },
  { source: "detail", value: "elevator", label: "Лифт", compactLabel: "Лифт" },
  { source: "detail", value: "equippedKitchen", label: "Оснащенная кухня", compactLabel: "Обор. кухня" },
  { source: "detail", value: "builtInWardrobes", label: "Встроенные шкафы", compactLabel: "Встр. шкафы" },
];

const heatingOptions: Array<{ value: HeatingType; label: string }> = [
  { value: "central", label: "Центральное отопление" },
  { value: "underfloor", label: "Теплый пол" },
  { value: "electric", label: "Электрическое" },
  { value: "heat_pump", label: "Тепловой насос" },
  { value: "gas_boiler", label: "Газовый котел" },
  { value: "none", label: "Нет" },
];

const energyRatingOptions: EnergyRating[] = ["A+", "A", "B", "B-", "C", "D"];

const transportModeOptions: Array<{ value: TransportMode; label: string }> = [
  { value: "metro", label: "Метро" },
  { value: "bus", label: "Автобус" },
  { value: "tram", label: "Трамвай" },
  { value: "train", label: "Поезд" },
  { value: "ferry", label: "Паром" },
];

const mockAiImagePool: Record<RoomType, string[]> = {
  bedroom: [
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80&sat=-5",
  ],
  living_room: [
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
  ],
  kitchen: [
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
  ],
  kids_room: [
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80&hue=20",
    "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80&sat=12",
  ],
  office: [
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
  ],
};

const roomTypeLabels: Record<RoomType, string> = {
  bedroom: "Спальня",
  living_room: "Гостиная",
  kitchen: "Кухня",
  kids_room: "Детская",
  office: "Кабинет",
};

function cloneProperty(property: PropertyListing): PropertyListing {
  return JSON.parse(JSON.stringify(property)) as PropertyListing;
}

function normalizePropertyCollection(properties: PropertyListing[]): PropertyListing[] {
  return properties.map((property) => normalizePropertyListing(property));
}

function createPropertyTemplate(): PropertyListing {
  const now = new Date().toISOString().slice(0, 10);

  return {
    id: "",
    slug: "",
    isActive: true,
    mode: "sale",
    title: "",
    city: "",
    district: "",
    country: "Португалия",
    location: {
      addressLabel: "",
      latitude: 0,
      longitude: 0,
      googleMapsUrl: buildGoogleMapsUrl(0, 0),
    },
    priceAmount: 0,
    priceLabel: "€0",
    shortDescription: "",
    fullDescription: "",
    bedrooms: 0,
    bathrooms: 0,
    areaM2: 0,
    imageUrl: DEFAULT_PROPERTY_COVER_URL,
    imageGallery: [],
    imageSources: {},
    features: ["city_center"],
    details: {
      propertyType: "apartment",
      usableAreaM2: 0,
      builtAreaM2: 0,
      floor: "",
      exterior: false,
      elevator: false,
      parkingSpaces: 0,
      storageRoom: false,
      builtInWardrobes: false,
      equippedKitchen: false,
      furnished: false,
      balconyCount: 0,
      terraceCount: 0,
      condition: "good",
      yearBuilt: 0,
      heating: "none",
      accessibilityAdapted: false,
      orientation: [],
      energyRating: "B",
      bathroomsFull: 0,
    },
    transportAccess: [],
    taxProfile: {
      propertyTransferTaxRate: 0.06,
      stampDutyRate: 0.008,
      notaryEstimateRate: 0.01,
    },
    agentName: "Ирина",
    publishedAt: now,
  };
}

function toNumber(value: string): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildPriceLabel(priceAmount: number, mode: PropertyListing["mode"]): string {
  const formattedAmount = new Intl.NumberFormat("ru-RU").format(Math.max(0, priceAmount));
  return mode === "rent" ? `€${formattedAmount} / месяц` : `€${formattedAmount}`;
}

function buildGeneratedPropertyId() {
  return String(Date.now());
}

function slugifyValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function buildPropertySlug(title: string, id: string) {
  const idPart = slugifyValue(id) || buildGeneratedPropertyId();
  const shortIdPart = idPart.replace(/^irina-/, "") || idPart;
  return shortIdPart;
}

function getPropertyPublicPath(property: PropertyListing) {
  const generatedIdSlug = property.id.replace(/^irina-/, "");
  const pathSlug = /^irina-\d+$/.test(property.id) ? generatedIdSlug : property.slug;

  return `/properties/${encodeURIComponent(pathSlug)}`;
}

function getPropertyDisplayId(property: Pick<PropertyListing, "id">) {
  return property.id.replace(/^irina-/, "");
}

function formatAiGenerationCost(
  usageEstimate: GenerateRoomDesignResult["usageEstimate"] | undefined
) {
  if (!usageEstimate) {
    return "";
  }

  const cost = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(usageEstimate.estimatedCostUsd);

  return `Примерная стоимость генерации: ${cost}. Токены: ${usageEstimate.totalTokens.toLocaleString("ru-RU")}, изображений: ${usageEstimate.generatedImages}.`;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} КБ`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

function isGeneratedPropertySlugForId(slug: string, id: string) {
  const normalizedSlug = slugifyValue(slug);
  const normalizedId = slugifyValue(id);
  const shortId = normalizedId.replace(/^irina-/, "");

  return Boolean(shortId) && normalizedSlug.includes(shortId);
}

function buildGoogleMapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

function parseOrientationValue(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function displayDraftNumberValue(value: number, isNewPropertyDraft: boolean): string | number {
  return isNewPropertyDraft && value === 0 ? "" : value;
}

function clampPercentage(value: number | undefined) {
  return Math.min(
    100,
    Math.max(0, typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 50)
  );
}

function normalizePropertyListing(property: PropertyListing): PropertyListing {
  const nextId = property.id.trim();
  const nextCity = normalizeCityName(property.city);
  const nextLatitude = Number(property.location.latitude);
  const nextLongitude = Number(property.location.longitude);
  const latitude = Number.isFinite(nextLatitude) ? nextLatitude : 38.7223;
  const longitude = Number.isFinite(nextLongitude) ? nextLongitude : -9.1393;
  const normalizedBathrooms = Math.max(
    0,
    property.details.bathroomsFull ?? property.bathrooms
  );
  const nextGallery = Array.from(
    new Set(property.imageGallery.map((imageUrl) => imageUrl.trim()).filter(Boolean))
  );
  const currentCoverImage = property.imageUrl?.trim();
  const normalizedCoverImage =
    currentCoverImage && nextGallery.includes(currentCoverImage)
      ? currentCoverImage
      : nextGallery[0] ?? currentCoverImage ?? DEFAULT_PROPERTY_COVER_URL;
  const normalizedImagePositions = Object.fromEntries(
    nextGallery.map((imageUrl) => {
      const position = property.imagePositions?.[imageUrl];

      return [
        imageUrl,
        {
          x: clampPercentage(position?.x),
          y: clampPercentage(position?.y),
        },
      ];
    })
  );
  const normalizedImageSources: Record<string, "original" | "ai_generated"> = Object.fromEntries(
    nextGallery.map((imageUrl) => [
      imageUrl,
      property.imageSources?.[imageUrl] === "ai_generated"
        ? "ai_generated"
        : "original",
    ])
  ) as Record<string, "original" | "ai_generated">;

  return {
    ...property,
    id: nextId,
    slug:
      !property.slug.trim() || isGeneratedPropertySlugForId(property.slug, nextId)
        ? buildPropertySlug(property.title, nextId || buildGeneratedPropertyId())
        : property.slug.trim(),
    isActive: property.isActive !== false,
    city: nextCity,
    district: property.district?.trim() || nextCity,
    country: "Португалия",
    priceAmount: Math.max(0, property.priceAmount),
    priceLabel: buildPriceLabel(Math.max(0, property.priceAmount), property.mode),
    bathrooms: normalizedBathrooms,
    imageGallery: nextGallery,
    imageUrl: normalizedCoverImage,
    imagePositions: normalizedImagePositions,
    imageSources: normalizedImageSources,
    location: {
      ...property.location,
      addressLabel: property.location.addressLabel.trim() || "Lisbon, Portugal",
      latitude,
      longitude,
      googleMapsUrl: buildGoogleMapsUrl(latitude, longitude),
    },
    details: {
      ...property.details,
      usableAreaM2: Math.max(0, property.details.usableAreaM2),
      builtAreaM2: Math.max(0, property.details.builtAreaM2),
      plotAreaM2: Math.max(0, property.details.plotAreaM2 ?? 0),
      parkingSpaces: Math.max(0, property.details.parkingSpaces),
      balconyCount: Math.max(0, property.details.balconyCount),
      terraceCount: Math.max(0, property.details.terraceCount),
      yearBuilt: Math.max(0, property.details.yearBuilt),
      bathroomsFull: normalizedBathrooms,
      guestBathrooms: Math.max(0, property.details.guestBathrooms ?? 0),
      buildingFloors: Math.max(0, property.details.buildingFloors ?? 0),
      monthlyCondoFeeEur: Math.max(0, property.details.monthlyCondoFeeEur ?? 0),
      orientation: property.details.orientation.filter(Boolean).length
        ? property.details.orientation.filter(Boolean)
        : ["юг"],
    },
    transportAccess: property.transportAccess.map((route) => ({
      ...route,
      route: route.route.trim(),
      stopName: route.stopName.trim(),
      walkMinutes: Math.max(0, route.walkMinutes),
    })),
    taxProfile: property.taxProfile
      ? {
          propertyTransferTaxRate: Math.max(0, property.taxProfile.propertyTransferTaxRate),
          stampDutyRate: Math.max(0, property.taxProfile.stampDutyRate),
          notaryEstimateRate: Math.max(0, property.taxProfile.notaryEstimateRate),
        }
      : undefined,
    agentName: property.agentName?.trim() || "Ирина",
  };
}

function getNestedValue(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((currentValue, segment) => {
    if (!currentValue || typeof currentValue !== "object") {
      return undefined;
    }

    return (currentValue as Record<string, unknown>)[segment];
  }, source);
}

function buildMockAiResult(
  selectedPhotos: UploadedAdminPhoto[],
  palette: (typeof paletteOptions)[number]["value"]
): GenerateRoomDesignResult {
  const variants = selectedPhotos.flatMap((photo) => {
    const roomLabel = roomTypeLabels[photo.roomType];
    const imagePool = mockAiImagePool[photo.roomType];

    return imagePool.map((imageUrl, imageIndex) => ({
      id: `mock-${photo.id}-${imageIndex + 1}`,
      title: `${roomLabel} · вариант ${imageIndex + 1}`,
      description:
        imageIndex === 0
          ? `Мок-вариант для ${photo.name} с более нейтральной меблировкой.`
          : `Мок-вариант для ${photo.name} с альтернативной расстановкой и палитрой ${palette}.`,
      furniture: [],
      photoImageUrl: imageUrl,
      palette: [palette],
      pros: ["Подходит для теста админки", "Можно сразу прикрепить к объекту"],
      cons: ["Это временный мок, не реальная AI-генерация"],
      layoutSource: "mock" as const,
    }));
  });

  return {
    jobId: `mock-admin-${Date.now()}`,
    roomAnalysis: {
      estimatedDimensions: {
        widthM: null,
        lengthM: null,
        heightM: null,
        confidence: "low",
      },
      detectedObjects: [],
      removableObjects: [],
      fixedElements: [],
      constraints: [],
      notes: ["Временный мок-режим админки"],
    },
    variants,
  };
}

export function AdminDashboard({
  initialProperties,
  initialInquiries,
  initialUsers,
}: AdminDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("catalog");
  const [properties, setProperties] = useState<PropertyListing[]>(initialProperties);
  const [inquiries, setInquiries] = useState<CustomerInquiry[]>(initialInquiries);
  const [users] = useState<RegisteredUser[]>(initialUsers);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    initialUsers[0]?.id ?? null
  );
  const catalogContentScrollRef = useRef<HTMLDivElement | null>(null);
  const photoFileInputRef = useRef<HTMLInputElement | null>(null);
  const imageNudgeIntervalRef = useRef<number | null>(null);
  const dragAutoScrollFrameRef = useRef<number | null>(null);
  const dragAutoScrollSpeedRef = useRef(0);

  useLayoutEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousWindowScrollX = window.scrollX;
    const previousWindowScrollY = window.scrollY;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      window.scrollTo({
        top: previousWindowScrollY,
        left: previousWindowScrollX,
        behavior: "auto",
      });
    };
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialProperties[0]?.id ?? null
  );
  const [propertyDraft, setPropertyDraft] = useState<PropertyListing | null>(
    initialProperties[0] ? cloneProperty(initialProperties[0]) : null
  );
  const [originalPropertyDraft, setOriginalPropertyDraft] = useState<PropertyListing | null>(
    initialProperties[0] ? cloneProperty(initialProperties[0]) : null
  );
  const [statusMessage, setStatusMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedAdminPhoto[]>([]);
  const [aiSourcePhotos, setAiSourcePhotos] = useState<AiSourcePhoto[]>([]);
  const [aiPalette, setAiPalette] =
    useState<(typeof paletteOptions)[number]["value"]>("light");
  const [aiResult, setAiResult] = useState<GenerateRoomDesignResult | null>(null);
  const [freshAiResultUrls, setFreshAiResultUrls] = useState<string[]>([]);
  const [aiStatus, setAiStatus] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [spareGalleryItems, setSpareGalleryItems] = useState<AdminSpareGalleryItem[]>([]);
  const [isJsonEditorOpen, setIsJsonEditorOpen] = useState(false);
  const [jsonEditorValue, setJsonEditorValue] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<
    Record<CollapsibleAdminSection, boolean>
  >({
    property: false,
    photos: false,
    ai: false,
    gif: false,
  });
  const [gifStartImageUrl, setGifStartImageUrl] = useState("");
  const [gifFinishImageUrl, setGifFinishImageUrl] = useState("");
  const [gifStartSeconds, setGifStartSeconds] = useState(1);
  const [gifTransitionSeconds, setGifTransitionSeconds] = useState(2);
  const [gifFinishSeconds, setGifFinishSeconds] = useState(1);
  const [gifStatus, setGifStatus] = useState("");
  const [gifResult, setGifResult] = useState<{
    gifUrl: string;
    sizeBytes: number;
    estimatedCostUsd: number;
    note: string;
  } | null>(null);
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);
  const [generationBalance, setGenerationBalance] =
    useState<GenerationBalance | null>(null);
  const [catalogModeFilter, setCatalogModeFilter] =
    useState<AdminCatalogModeFilter>("all");
  const [catalogIdQuery, setCatalogIdQuery] = useState("");
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const [geocodeMessage, setGeocodeMessage] = useState("");
  const [pendingLeaveAction, setPendingLeaveAction] =
    useState<PendingLeaveAction | null>(null);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);

  const filteredProperties = properties.filter((property) => {
    const matchesMode =
      catalogModeFilter === "all" ? true : property.mode === catalogModeFilter;
    const normalizedQuery = catalogIdQuery.trim().toLowerCase();
    const matchesId =
      normalizedQuery.length === 0
        ? true
        : property.id.toLowerCase().includes(normalizedQuery) ||
          property.id.replace(/^irina-/, "").toLowerCase().includes(normalizedQuery) ||
          property.slug.toLowerCase().includes(normalizedQuery);

    return matchesMode && matchesId;
  });

  const currentPropertyType = propertyDraft?.details.propertyType;
  const isLandProperty = currentPropertyType === "land";
  const hasAttachedLand = ["house", "villa", "townhouse", "land"].includes(
    currentPropertyType ?? ""
  );
  const showsResidentialFields = Boolean(currentPropertyType) && !isLandProperty;
  const showsSecondaryAreaFields = hasAttachedLand && !isLandProperty;
  const showsPlotAreaField = hasAttachedLand;
  const showsCompactResidentialLayout = showsResidentialFields && !showsSecondaryAreaFields;
  const showsCompactAttachedLandLayout = showsResidentialFields && showsSecondaryAreaFields;
  const showsCompactLayout = showsCompactResidentialLayout || showsCompactAttachedLandLayout;
  const isNewPropertyDraft = selectedId === null;
  const visibleFeatureOptions = listingFeatureOptions.filter((feature) => {
    if (isLandProperty) {
      return (
        feature.source === "feature" &&
        (feature.value === "sea_view" || feature.value === "security")
      );
    }

    return true;
  });
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? users[0] ?? null;
  const usersById = new Map(users.map((user) => [user.id, user] as const));
  const featureGridClass = showsCompactLayout
    ? "mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6"
    : "mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4";
  const visibleAiVariants = (aiResult?.variants ?? []).filter((variant) => {
    if (freshAiResultUrls.includes(variant.photoImageUrl)) {
      return true;
    }

    const isInMainGallery =
      propertyDraft?.imageGallery.includes(variant.photoImageUrl) ?? false;
    const isInSpareGallery = spareGalleryItems.some(
      (item) => item.imageUrl === variant.photoImageUrl
    );

    return !isInMainGallery && !isInSpareGallery;
  });
  const hasUnsavedChanges =
    propertyDraft !== null &&
    originalPropertyDraft !== null &&
    JSON.stringify(propertyDraft) !== JSON.stringify(originalPropertyDraft);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!selectedId) {
      setAiResult(null);
      setSpareGalleryItems([]);
      return;
    }

    void loadSavedAiResults(selectedId);
    void loadSpareGallery(selectedId);
  }, [selectedId]);

  useEffect(() => {
    return () => {
      stopImageNudge();
      stopDragAutoScroll();
    };
  }, []);

  useEffect(() => {
    void loadGenerationBalance();
  }, []);

  function openPhotoPicker() {
    const fileInput = photoFileInputRef.current;

    if (!fileInput) {
      return;
    }

    if (typeof fileInput.showPicker === "function") {
      fileInput.showPicker();
      return;
    }

    fileInput.click();
  }

  function toggleAdminSection(section: CollapsibleAdminSection) {
    setCollapsedSections((currentSections) => ({
      ...currentSections,
      [section]: !currentSections[section],
    }));
  }

  function isSectionCollapsed(section: CollapsibleAdminSection) {
    return collapsedSections[section];
  }

  function renderCollapseButton(section: CollapsibleAdminSection) {
    const isCollapsed = isSectionCollapsed(section);

    return (
      <button
        type="button"
        onClick={() => toggleAdminSection(section)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-800"
      >
        {isCollapsed ? "Развернуть" : "Свернуть"}
      </button>
    );
  }

  async function loadGenerationBalance() {
    try {
      const response = await fetch("/api/admin/generation-balance", {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      setGenerationBalance((await response.json()) as GenerationBalance);
    } catch {
      // Balance is informational; the editor can continue without it.
    }
  }

  function stopDragAutoScroll() {
    dragAutoScrollSpeedRef.current = 0;

    if (dragAutoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(dragAutoScrollFrameRef.current);
      dragAutoScrollFrameRef.current = null;
    }
  }

  function runDragAutoScroll() {
    const scrollContainer = catalogContentScrollRef.current;
    const speed = dragAutoScrollSpeedRef.current;

    if (!scrollContainer || speed === 0) {
      dragAutoScrollFrameRef.current = null;
      return;
    }

    scrollContainer.scrollTop += speed;
    dragAutoScrollFrameRef.current = window.requestAnimationFrame(runDragAutoScroll);
  }

  function updateDragAutoScroll(event: DragEvent<HTMLElement>) {
    const scrollContainer = catalogContentScrollRef.current;

    if (!scrollContainer) {
      return;
    }

    const rect = scrollContainer.getBoundingClientRect();
    const edgeSize = Math.min(140, rect.height / 3);
    let nextSpeed = 0;

    if (event.clientY < rect.top + edgeSize) {
      nextSpeed = -Math.ceil(((rect.top + edgeSize - event.clientY) / edgeSize) * 18);
    } else if (event.clientY > rect.bottom - edgeSize) {
      nextSpeed = Math.ceil(((event.clientY - (rect.bottom - edgeSize)) / edgeSize) * 18);
    }

    dragAutoScrollSpeedRef.current = nextSpeed;

    if (nextSpeed !== 0 && dragAutoScrollFrameRef.current === null) {
      dragAutoScrollFrameRef.current = window.requestAnimationFrame(runDragAutoScroll);
    }

    if (nextSpeed === 0 && dragAutoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(dragAutoScrollFrameRef.current);
      dragAutoScrollFrameRef.current = null;
    }
  }

  async function handleAdminLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  function isFieldChanged(path: string) {
    if (!propertyDraft || !originalPropertyDraft) {
      return false;
    }

    return (
      JSON.stringify(getNestedValue(propertyDraft, path)) !==
      JSON.stringify(getNestedValue(originalPropertyDraft, path))
    );
  }

  function withChangedFieldClass(baseClassName: string, path: string) {
    return `${baseClassName}${
      isFieldChanged(path)
        ? " border-amber-500 bg-amber-50 ring-2 ring-amber-200 shadow-[0_0_0_1px_rgba(245,158,11,0.18)]"
        : ""
    }`;
  }

  function withChangedBlockClass(baseClassName: string, isChanged: boolean) {
    return `${baseClassName}${
      isChanged
        ? " border-amber-500 bg-amber-50 ring-2 ring-amber-200 shadow-[0_0_0_1px_rgba(245,158,11,0.18)]"
        : ""
    }`;
  }

  function isFeatureOptionChanged(option: FeatureOption) {
    if (!propertyDraft || !originalPropertyDraft) {
      return false;
    }

    if (option.source === "feature") {
      return (
        propertyDraft.features.includes(option.value) !==
        originalPropertyDraft.features.includes(option.value)
      );
    }

    return Boolean(propertyDraft.details[option.value]) !== Boolean(originalPropertyDraft.details[option.value]);
  }

  function isTransportRouteChanged(index: number) {
    if (!propertyDraft || !originalPropertyDraft) {
      return false;
    }

    return (
      JSON.stringify(propertyDraft.transportAccess[index]) !==
      JSON.stringify(originalPropertyDraft.transportAccess[index])
    );
  }

  function isGalleryImageChanged(imageUrl: string, index: number) {
    if (!propertyDraft || !originalPropertyDraft) {
      return false;
    }

    return (
      !originalPropertyDraft.imageGallery.includes(imageUrl) ||
      originalPropertyDraft.imageGallery[index] !== imageUrl ||
      (propertyDraft.imageUrl === imageUrl && originalPropertyDraft.imageUrl !== imageUrl) ||
      JSON.stringify(propertyDraft.imagePositions?.[imageUrl] ?? { x: 50, y: 50 }) !==
        JSON.stringify(originalPropertyDraft.imagePositions?.[imageUrl] ?? { x: 50, y: 50 })
    );
  }

  function isAiGeneratedImage(imageUrl: string) {
    return (
      propertyDraft?.imageSources?.[imageUrl] === "ai_generated" ||
      spareGalleryItems.some((item) => item.imageUrl === imageUrl && item.source === "ai") ||
      (aiResult?.variants ?? []).some((variant) => variant.photoImageUrl === imageUrl)
    );
  }

  function applySelectedProperty(property: PropertyListing) {
    const normalizedProperty = normalizePropertyListing(property);
    setSelectedId(normalizedProperty.id);
    setPropertyDraft(cloneProperty(normalizedProperty));
    setOriginalPropertyDraft(cloneProperty(normalizedProperty));
    setStatusMessage("");
    setGeocodeMessage("");
    setAiStatus("");
    setAiResult(null);
    setFreshAiResultUrls([]);
    setUploadedPhotos([]);
    setAiSourcePhotos([]);
    void loadSavedAiResults(normalizedProperty.id);
    void loadSpareGallery(normalizedProperty.id);
  }

  function applyCreatePropertyTemplate() {
    const template = normalizePropertyListing(createPropertyTemplate());
    setGeocodeMessage("");
    setSelectedId(null);
    setPropertyDraft(cloneProperty(template));
    setOriginalPropertyDraft(cloneProperty(template));
    setUploadedPhotos([]);
    setAiSourcePhotos([]);
    setAiResult(null);
    setFreshAiResultUrls([]);
    setSpareGalleryItems([]);
    setAiStatus("");
  }

  function applyPendingLeaveAction(action: PendingLeaveAction) {
    if (action.kind === "select") {
      applySelectedProperty(action.property);
      return;
    }

    applyCreatePropertyTemplate();
  }

  function requestLeaveAction(action: PendingLeaveAction) {
    if (!hasUnsavedChanges) {
      applyPendingLeaveAction(action);
      return;
    }

    setPendingLeaveAction(action);
    setIsLeaveDialogOpen(true);
  }

  async function handleLeaveDialogSave() {
    const nextAction = pendingLeaveAction;

    if (!nextAction) {
      return;
    }

    const isSaved = await saveSelectedProperty();

    if (!isSaved) {
      return;
    }

    setIsLeaveDialogOpen(false);
    setPendingLeaveAction(null);
    applyPendingLeaveAction(nextAction);
  }

  function handleLeaveDialogDiscard() {
    if (!pendingLeaveAction) {
      return;
    }

    const nextAction = pendingLeaveAction;
    setIsLeaveDialogOpen(false);
    setPendingLeaveAction(null);
    applyPendingLeaveAction(nextAction);
  }

  function handleLeaveDialogCancel() {
    setIsLeaveDialogOpen(false);
    setPendingLeaveAction(null);
  }

  async function selectProperty(property: PropertyListing) {
    requestLeaveAction({ kind: "select", property });
  }

  function openJsonEditor() {
    if (!propertyDraft) {
      return;
    }

    setJsonEditorValue(JSON.stringify(cloneProperty(propertyDraft), null, 2));
    setIsJsonEditorOpen(true);
    setStatusMessage("");
  }

  function setDraftValue<Key extends keyof PropertyListing>(
    key: Key,
    value: PropertyListing[Key]
  ) {
    setPropertyDraft((currentDraft) =>
      currentDraft ? { ...currentDraft, [key]: value } : currentDraft
    );
  }

  function setDraftLocationValue<Key extends keyof PropertyListing["location"]>(
    key: Key,
    value: PropertyListing["location"][Key]
  ) {
    setPropertyDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            location: {
              ...currentDraft.location,
              [key]: value,
            },
          }
        : currentDraft
    );
  }

  function setDraftDetailsValue<Key extends keyof PropertyListing["details"]>(
    key: Key,
    value: PropertyListing["details"][Key]
  ) {
    setPropertyDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            details: {
              ...currentDraft.details,
              [key]: value,
            },
          }
        : currentDraft
    );
  }

  function toggleDraftFeature(feature: ListingFeature) {
    setPropertyDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            features: currentDraft.features.includes(feature)
              ? currentDraft.features.filter((item) => item !== feature)
              : [...currentDraft.features, feature],
          }
        : currentDraft
    );
  }

  function isFeatureOptionChecked(option: FeatureOption) {
    if (!propertyDraft) {
      return false;
    }

    if (option.source === "feature") {
      return propertyDraft.features.includes(option.value);
    }

    return Boolean(propertyDraft.details[option.value]);
  }

  function toggleFeatureOption(option: FeatureOption) {
    if (option.source === "feature") {
      toggleDraftFeature(option.value);
      return;
    }

    setDraftDetailsValue(option.value, !Boolean(propertyDraft?.details[option.value]));
  }

  function setDraftTransportValue(
    index: number,
    key: keyof PropertyListing["transportAccess"][number],
    value: string | number
  ) {
    setPropertyDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            transportAccess: currentDraft.transportAccess.map((route, routeIndex) =>
              routeIndex === index
                ? {
                    ...route,
                    [key]: value,
                  }
                : route
            ),
          }
        : currentDraft
    );
  }

  function addTransportRoute() {
    setPropertyDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            transportAccess: [
              ...currentDraft.transportAccess,
              {
                mode: "metro",
                route: "",
                stopName: "",
                walkMinutes: 0,
              },
            ],
          }
        : currentDraft
    );
  }

  function removeTransportRoute(index: number) {
    setPropertyDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            transportAccess: currentDraft.transportAccess.filter(
              (_route, routeIndex) => routeIndex !== index
            ),
          }
        : currentDraft
    );
  }

  function setDraftTaxValue(
    key: keyof NonNullable<PropertyListing["taxProfile"]>,
    value: number
  ) {
    setPropertyDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            taxProfile: {
              propertyTransferTaxRate: currentDraft.taxProfile?.propertyTransferTaxRate ?? 0,
              stampDutyRate: currentDraft.taxProfile?.stampDutyRate ?? 0,
              notaryEstimateRate: currentDraft.taxProfile?.notaryEstimateRate ?? 0,
              [key]: value,
            },
          }
        : currentDraft
    );
  }

  async function fillCoordinatesFromAddress() {
    if (!propertyDraft) {
      return;
    }

    const address = propertyDraft.location.addressLabel.trim();

    if (!address) {
      setGeocodeMessage("Укажите адрес, чтобы заполнить координаты.");
      return;
    }

    setIsGeocodingAddress(true);
    setGeocodeMessage("");

    try {
      const response = await fetch("/api/admin/geocode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address,
          city: normalizeCityName(propertyDraft.city),
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        latitude?: number;
        longitude?: number;
      };

      if (!response.ok || payload.latitude === undefined || payload.longitude === undefined) {
        setPropertyDraft((currentDraft) =>
          currentDraft
            ? {
                ...currentDraft,
                location: {
                  ...currentDraft.location,
                  latitude: 0,
                  longitude: 0,
                },
              }
            : currentDraft
        );
        setGeocodeMessage(payload.error ?? "Не удалось определить координаты.");
        return;
      }

      setPropertyDraft((currentDraft) =>
        currentDraft
          ? {
              ...currentDraft,
              location: {
                ...currentDraft.location,
                latitude: payload.latitude ?? currentDraft.location.latitude,
                longitude: payload.longitude ?? currentDraft.location.longitude,
              },
            }
          : currentDraft
      );
      setGeocodeMessage("Координаты заполнены по адресу.");
    } catch {
      setPropertyDraft((currentDraft) =>
        currentDraft
          ? {
              ...currentDraft,
              location: {
                ...currentDraft.location,
                latitude: 0,
                longitude: 0,
              },
            }
          : currentDraft
      );
      setGeocodeMessage("Не удалось определить координаты.");
    } finally {
      setIsGeocodingAddress(false);
    }
  }

  async function persistProperty(
    nextProperty: PropertyListing,
    currentId = nextProperty.id
  ): Promise<boolean> {
    const response = await fetch(`/api/admin/properties/${currentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(nextProperty),
    });

    const responseText = await response.text();
    const payload = (responseText ? JSON.parse(responseText) : {}) as {
      error?: string;
      properties?: PropertyListing[];
    };

    if (!response.ok || !payload.properties) {
      setStatusMessage(payload.error ?? "Не удалось сохранить объект.");
      return false;
    }

    const normalizedProperties = normalizePropertyCollection(payload.properties);
    const savedProperty =
      normalizedProperties.find((property) => property.id === nextProperty.id) ??
      normalizePropertyListing(nextProperty);

    setProperties(normalizedProperties);
    setSelectedId(savedProperty.id);
    setPropertyDraft(cloneProperty(savedProperty));
    setOriginalPropertyDraft(cloneProperty(savedProperty));
    router.refresh();
    return true;
  }

  async function saveSelectedProperty(): Promise<boolean> {
    if (!propertyDraft) {
      return false;
    }

    const nextId = propertyDraft.id.trim() || buildGeneratedPropertyId();
    const nextProperty = normalizePropertyListing({
      ...propertyDraft,
      id: nextId,
      slug:
        !propertyDraft.slug.trim() || isGeneratedPropertySlugForId(propertyDraft.slug, nextId)
          ? buildPropertySlug(propertyDraft.title, nextId)
          : propertyDraft.slug.trim(),
    });

    setIsSaving(true);
    setStatusMessage("");

    try {
      if (!selectedId) {
        const response = await fetch("/api/admin/properties", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(nextProperty),
        });

        const payload = (await response.json()) as {
          error?: string;
          properties?: PropertyListing[];
        };

        if (!response.ok || !payload.properties) {
          setStatusMessage(payload.error ?? "Не удалось создать объект.");
          return false;
        }

        const normalizedProperties = normalizePropertyCollection(payload.properties);
        const createdProperty =
          normalizedProperties.find((property) => property.id === nextProperty.id) ??
          normalizePropertyListing(nextProperty);
        setProperties(normalizedProperties);
        setSelectedId(createdProperty.id);
        setPropertyDraft(cloneProperty(createdProperty));
        setOriginalPropertyDraft(cloneProperty(createdProperty));
        setStatusMessage("Объект сохранен.");
        return true;
      }

      const isSaved = await persistProperty(nextProperty, selectedId);

      if (isSaved) {
        setStatusMessage("Объект сохранен.");
        return true;
      }

      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function createProperty() {
    requestLeaveAction({ kind: "create" });
  }

  async function deleteSelectedProperty() {
    if (!selectedId) {
      return;
    }

    setIsSaving(true);

    const response = await fetch(`/api/admin/properties/${selectedId}`, {
      method: "DELETE",
    });

    const payload = (await response.json()) as {
      error?: string;
      properties?: PropertyListing[];
    };

    if (!response.ok || !payload.properties) {
      setStatusMessage(payload.error ?? "Не удалось удалить объект.");
      setIsSaving(false);
      return;
    }

    const normalizedProperties = normalizePropertyCollection(payload.properties);
    const nextSelected = normalizedProperties[0] ?? null;
    setProperties(normalizedProperties);
    setSelectedId(nextSelected?.id ?? null);
    setPropertyDraft(nextSelected ? cloneProperty(nextSelected) : null);
    setOriginalPropertyDraft(nextSelected ? cloneProperty(nextSelected) : null);
    setGeocodeMessage("");
    setUploadedPhotos([]);
    setAiSourcePhotos([]);
    setAiResult(null);
    setFreshAiResultUrls([]);
    setSpareGalleryItems([]);
    setStatusMessage("Объект удален.");
    setIsSaving(false);
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    if (!propertyDraft) {
      event.target.value = "";
      return;
    }

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const fileContents = await file.text();

    try {
      const parsed = JSON.parse(fileContents) as PropertyListing;
      setJsonEditorValue(JSON.stringify(parsed, null, 2));
      setStatusMessage("JSON объекта загружен в редактор.");
    } catch {
      setStatusMessage("Файл не является валидным JSON.");
    } finally {
      event.target.value = "";
    }
  }

  function exportJson() {
    if (!propertyDraft) {
      return;
    }

    const blob = new Blob([JSON.stringify(propertyDraft, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${getPropertyDisplayId(propertyDraft)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function saveJsonEditor() {
    if (!propertyDraft) {
      return;
    }

    try {
      const parsed = JSON.parse(jsonEditorValue) as PropertyListing;
      const nextId = parsed.id.trim() || buildGeneratedPropertyId();
      const nextProperty = normalizePropertyListing({
        ...parsed,
        id: nextId,
        slug: parsed.slug.trim() || buildPropertySlug(parsed.title, nextId),
      });

      if (!selectedId) {
        const response = await fetch("/api/admin/properties", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(nextProperty),
        });

        const payload = (await response.json()) as {
          error?: string;
          properties?: PropertyListing[];
        };

        if (!response.ok || !payload.properties) {
          setStatusMessage(payload.error ?? "Не удалось создать объект.");
          return;
        }

        const normalizedProperties = normalizePropertyCollection(payload.properties);
        const createdProperty =
          normalizedProperties.find((property) => property.id === nextProperty.id) ??
          normalizePropertyListing(nextProperty);
        setProperties(normalizedProperties);
        setSelectedId(createdProperty.id);
        setPropertyDraft(cloneProperty(createdProperty));
        setOriginalPropertyDraft(cloneProperty(createdProperty));
        setJsonEditorValue(JSON.stringify(createdProperty, null, 2));
        setStatusMessage("JSON объекта сохранен.");
        setIsJsonEditorOpen(false);
        return;
      }

      const isSaved = await persistProperty(nextProperty, selectedId);

      if (isSaved) {
        setJsonEditorValue(JSON.stringify(nextProperty, null, 2));
        setStatusMessage("JSON объекта сохранен.");
        setIsJsonEditorOpen(false);
      }
    } catch {
      setStatusMessage("JSON содержит ошибку.");
    }
  }

  async function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    if (!propertyDraft?.id || !selectedId) {
      setAiStatus("Сначала сохраните объект, затем загружайте фото в запасную галерею.");
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("propertyId", propertyDraft.id);

    for (const file of files) {
      formData.append("files", file);
    }

    const response = await fetch("/api/admin/uploads", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as {
      error?: string;
      uploads?: Array<{ name: string; url: string }>;
    };

    if (!response.ok || !payload.uploads) {
      setAiStatus(payload.error ?? "Не удалось загрузить фотографии.");
      event.target.value = "";
      return;
    }

    const nextPhotos = payload.uploads.map((upload, index) => ({
      id: `${Date.now()}-${index}-${upload.name}`,
      file: files[index],
      name: upload.name,
      previewUrl: upload.url,
      selectedForAi: true,
      roomType: "living_room" as RoomType,
    }));

    setUploadedPhotos((currentPhotos) => [...currentPhotos, ...nextPhotos]);
    await loadSpareGallery(propertyDraft.id);
    setAiStatus("Фотографии загружены. Можно выбрать кадры для AI-обработки.");
    event.target.value = "";
  }

  function togglePhotoForAi(photoId: string) {
    setUploadedPhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        photo.id === photoId
          ? { ...photo, selectedForAi: !photo.selectedForAi }
          : photo
      )
    );
  }

  function setPhotoRoomType(photoId: string, roomType: RoomType) {
    setUploadedPhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        photo.id === photoId ? { ...photo, roomType } : photo
      )
    );
  }

  function togglePhotoInGallery(imageUrl: string, shouldInclude: boolean) {
    if (!propertyDraft) {
      return;
    }

    setPropertyDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      if (shouldInclude) {
        const nextGallery = currentDraft.imageGallery.includes(imageUrl)
          ? currentDraft.imageGallery
          : [...currentDraft.imageGallery, imageUrl];
        const nextImagePositions = {
          ...currentDraft.imagePositions,
          [imageUrl]: currentDraft.imagePositions?.[imageUrl] ?? { x: 50, y: 50 },
        };
        const nextImageSources = {
          ...currentDraft.imageSources,
          [imageUrl]: isAiGeneratedImage(imageUrl) ? "ai_generated" as const : "original" as const,
        };

        return {
          ...currentDraft,
          imageUrl:
            currentDraft.imageUrl === DEFAULT_PROPERTY_COVER_URL || !currentDraft.imageUrl
              ? imageUrl
              : currentDraft.imageUrl,
          imageGallery: nextGallery,
          imagePositions: nextImagePositions,
          imageSources: nextImageSources,
        };
      }

      const nextGallery = currentDraft.imageGallery.filter((item) => item !== imageUrl);
      const nextImagePositions = { ...currentDraft.imagePositions };
      const nextImageSources = { ...currentDraft.imageSources };
      delete nextImagePositions[imageUrl];
      delete nextImageSources[imageUrl];

      return {
        ...currentDraft,
        imageUrl:
          currentDraft.imageUrl === imageUrl
            ? nextGallery[0] ?? DEFAULT_PROPERTY_COVER_URL
            : currentDraft.imageUrl,
        imageGallery: nextGallery,
        imagePositions: nextImagePositions,
        imageSources: nextImageSources,
      };
    });
  }

  async function addImageFromSpareToGallery(imageUrl: string) {
    const nextDraft = applyGalleryInclusion(propertyDraft, imageUrl, true);

    if (!nextDraft) {
      return;
    }

    setPropertyDraft(nextDraft);
    setSpareGalleryItems((currentItems) =>
      currentItems.filter((item) => item.imageUrl !== imageUrl)
    );
    await persistImmediateGalleryChange(nextDraft, "Фото добавлено в основную галерею.");
  }

  function applyGalleryInclusion(
    currentDraft: PropertyListing | null,
    imageUrl: string,
    shouldInclude: boolean
  ) {
    if (!currentDraft) {
      return null;
    }

    if (shouldInclude) {
      const nextGallery = currentDraft.imageGallery.includes(imageUrl)
        ? currentDraft.imageGallery
        : [...currentDraft.imageGallery, imageUrl];
    const nextImagePositions = {
      ...currentDraft.imagePositions,
      [imageUrl]: currentDraft.imagePositions?.[imageUrl] ?? { x: 50, y: 50 },
    };
    const nextImageSources = {
      ...currentDraft.imageSources,
      [imageUrl]: isAiGeneratedImage(imageUrl) ? "ai_generated" as const : "original" as const,
    };

    return {
        ...currentDraft,
        imageUrl:
          currentDraft.imageUrl === DEFAULT_PROPERTY_COVER_URL || !currentDraft.imageUrl
            ? imageUrl
            : currentDraft.imageUrl,
      imageGallery: nextGallery,
      imagePositions: nextImagePositions,
      imageSources: nextImageSources,
    };
  }

  const nextGallery = currentDraft.imageGallery.filter((item) => item !== imageUrl);
  const nextImagePositions = { ...currentDraft.imagePositions };
  const nextImageSources = { ...currentDraft.imageSources };
  delete nextImagePositions[imageUrl];
  delete nextImageSources[imageUrl];

    return {
      ...currentDraft,
      imageUrl:
        currentDraft.imageUrl === imageUrl
          ? nextGallery[0] ?? DEFAULT_PROPERTY_COVER_URL
          : currentDraft.imageUrl,
    imageGallery: nextGallery,
    imagePositions: nextImagePositions,
    imageSources: nextImageSources,
  };
}

  async function persistImmediateGalleryChange(
    nextDraft: PropertyListing,
    successMessage: string
  ) {
    const saved = await persistProperty(normalizePropertyListing(nextDraft), selectedId ?? nextDraft.id);

    if (saved) {
      setStatusMessage(successMessage);
    }

    return saved;
  }

  function writeGalleryDragData(
    event: DragEvent<HTMLElement>,
    imageUrl: string,
    source: GalleryDragSource
  ) {
    stopDragAutoScroll();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "application/x-admin-gallery-image",
      JSON.stringify({ imageUrl, source })
    );
    event.dataTransfer.setData("text/plain", imageUrl);
  }

  function readGalleryDragData(event: DragEvent<HTMLElement>) {
    const rawData =
      event.dataTransfer.getData("application/x-admin-gallery-image") ||
      event.dataTransfer.getData("text/plain");

    if (!rawData) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawData) as {
        imageUrl?: string;
        source?: GalleryDragSource;
      };

      return parsed.imageUrl
        ? { imageUrl: parsed.imageUrl, source: parsed.source ?? "main" }
        : null;
    } catch {
      return { imageUrl: rawData, source: "main" as const };
    }
  }

  async function reorderMainGallery(draggedImageUrl: string, targetImageUrl: string) {
    if (!propertyDraft || draggedImageUrl === targetImageUrl) {
      return;
    }

    const draggedIndex = propertyDraft.imageGallery.indexOf(draggedImageUrl);
    const targetIndex = propertyDraft.imageGallery.indexOf(targetImageUrl);

    if (draggedIndex < 0 || targetIndex < 0) {
      return;
    }

    const nextGallery = [...propertyDraft.imageGallery];
    const [draggedImage] = nextGallery.splice(draggedIndex, 1);
    nextGallery.splice(targetIndex, 0, draggedImage);
    const nextDraft = {
      ...propertyDraft,
      imageGallery: nextGallery,
    };

    setPropertyDraft(nextDraft);
    await persistImmediateGalleryChange(nextDraft, "Порядок фотографий сохранен.");
  }

  async function handleMainGalleryDrop(
    event: DragEvent<HTMLElement>,
    targetImageUrl?: string
  ) {
    event.preventDefault();

    const dragData = readGalleryDragData(event);

    if (!dragData) {
      return;
    }

    if (
      dragData.source === "spare" ||
      dragData.source === "ai-result" ||
      dragData.source === "gif-result"
    ) {
      await addImageFromSpareToGallery(dragData.imageUrl);
      return;
    }

    if (targetImageUrl) {
      await reorderMainGallery(dragData.imageUrl, targetImageUrl);
    }
  }

  async function handleSpareGalleryDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();

    const dragData = readGalleryDragData(event);

    if (!dragData) {
      return;
    }

    if (dragData.source === "main") {
      await moveImageFromMainToSpare(dragData.imageUrl);
      return;
    }

    if (
      (dragData.source === "ai-result" || dragData.source === "gif-result") &&
      propertyDraft?.id
    ) {
      await ensureImageInSpareGallery(dragData.imageUrl);
    }
  }

  function removeAiResultVariant(imageUrl: string) {
    setFreshAiResultUrls((currentUrls) =>
      currentUrls.filter((currentUrl) => currentUrl !== imageUrl)
    );
    setAiResult((currentResult) => {
      if (!currentResult) {
        return currentResult;
      }

      const nextVariants = currentResult.variants.filter(
        (variant) => variant.photoImageUrl !== imageUrl
      );

      return nextVariants.length > 0
        ? { ...currentResult, variants: nextVariants }
        : null;
    });
  }

  async function ensureImageInSpareGallery(imageUrl: string) {
    if (!propertyDraft?.id) {
      return;
    }

    const response = await fetch("/api/admin/spare-gallery", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ propertyId: propertyDraft.id, imageUrl }),
    });
    const payload = (await response.json()) as {
      error?: string;
      items?: AdminSpareGalleryItem[];
    };

    if (!response.ok) {
      setStatusMessage(payload.error ?? "Не удалось добавить фото в запасную галерею.");
      return;
    }

    await loadSpareGallery(propertyDraft.id);
    removeAiResultVariant(imageUrl);
    if (gifResult?.gifUrl === imageUrl) {
      setGifResult(null);
    }
    setStatusMessage("Фотография добавлена в запасную галерею.");
  }

  function addAiSourcePhoto(imageUrl: string) {
    const spareItem = spareGalleryItems.find((item) => item.imageUrl === imageUrl);
    const mainIndex = propertyDraft?.imageGallery.indexOf(imageUrl) ?? -1;
    const name =
      spareItem?.title ??
      (mainIndex >= 0 ? `Фото ${mainIndex + 1} из основной галереи` : "Исходное фото");

    setAiSourcePhotos((currentPhotos) => {
      if (currentPhotos.some((photo) => photo.imageUrl === imageUrl)) {
        return currentPhotos;
      }

      return [
        ...currentPhotos,
        {
          id: `${Date.now()}-${currentPhotos.length + 1}`,
          imageUrl,
          name,
          roomType: "living_room",
        },
      ];
    });
    setAiStatus("Фото добавлено как исходник для генерации.");
  }

  function handleAiSourceDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();

    const dragData = readGalleryDragData(event);

    if (!dragData) {
      return;
    }

    addAiSourcePhoto(dragData.imageUrl);
  }

  function handleGifImageDrop(event: DragEvent<HTMLElement>, slot: GifImageSlot) {
    event.preventDefault();

    const dragData = readGalleryDragData(event);

    if (!dragData) {
      return;
    }

    if (slot === "start") {
      setGifStartImageUrl(dragData.imageUrl);
    } else {
      setGifFinishImageUrl(dragData.imageUrl);
    }

    setGifStatus("");
  }

  async function generateTransitionGif() {
    if (!gifStartImageUrl || !gifFinishImageUrl) {
      setGifStatus("Добавьте стартовое и финальное фото.");
      return;
    }

    setIsGeneratingGif(true);
    setGifStatus("");
    setGifResult(null);

    try {
      const response = await fetch("/api/admin/gif", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startImageUrl: gifStartImageUrl,
          finishImageUrl: gifFinishImageUrl,
          startSeconds: gifStartSeconds,
          transitionSeconds: gifTransitionSeconds,
          finishSeconds: gifFinishSeconds,
          propertyId: propertyDraft?.id,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        gifUrl?: string;
        sizeBytes?: number;
        estimatedCostUsd?: number;
        note?: string;
      };

      if (!response.ok || !payload.gifUrl) {
        setGifStatus(payload.error ?? "Не удалось сгенерировать GIF.");
        return;
      }

      setGifResult({
        gifUrl: payload.gifUrl,
        sizeBytes: payload.sizeBytes ?? 0,
        estimatedCostUsd: payload.estimatedCostUsd ?? 0,
        note: payload.note ?? "GIF собрана локально через sharp, OpenAI не используется.",
      });
      setGifStatus(
        `GIF готов${payload.sizeBytes ? `, размер ${formatBytes(payload.sizeBytes)}` : ""}. Стоимость генерации: ${formatUsd(payload.estimatedCostUsd ?? 0)}.`
      );
      await loadGenerationBalance();
    } catch {
      setGifStatus("Не удалось сгенерировать GIF.");
    } finally {
      setIsGeneratingGif(false);
    }
  }

  function removeAiSourcePhoto(imageUrl: string) {
    setAiSourcePhotos((currentPhotos) =>
      currentPhotos.filter((photo) => photo.imageUrl !== imageUrl)
    );
  }

  function setAiSourceRoomType(photoId: string, roomType: RoomType) {
    setAiSourcePhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        photo.id === photoId ? { ...photo, roomType } : photo
      )
    );
  }

  async function fetchImageAsFile(imageUrl: string, fileName: string) {
    const absoluteUrl = new URL(imageUrl, window.location.origin).toString();
    const response = await fetch(absoluteUrl);

    if (!response.ok) {
      throw new Error("Image fetch failed");
    }

    const blob = await response.blob();
    return new File([blob], fileName, {
      type: blob.type || "image/jpeg",
    });
  }

  function setCoverImage(imageUrl: string) {
    if (!propertyDraft) {
      return;
    }

    setPropertyDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            imageUrl,
          }
        : currentDraft
    );
    setStatusMessage("Обложка выбрана. Сохраните объект, чтобы закрепить изменение.");
  }

  function nudgeGalleryImagePosition(
    imageUrl: string,
    axis: "x" | "y",
    delta: number
  ) {
    setPropertyDraft((currentDraft) => {
      if (!currentDraft || !currentDraft.imageGallery.includes(imageUrl)) {
        return currentDraft;
      }

      const currentPosition = currentDraft.imagePositions?.[imageUrl] ?? { x: 50, y: 50 };

      return {
        ...currentDraft,
        imagePositions: {
          ...currentDraft.imagePositions,
          [imageUrl]: {
            ...currentPosition,
            [axis]: clampPercentage(currentPosition[axis] + delta),
          },
        },
      };
    });
  }

  function stopImageNudge() {
    if (imageNudgeIntervalRef.current) {
      window.clearInterval(imageNudgeIntervalRef.current);
      imageNudgeIntervalRef.current = null;
    }
  }

  function startImageNudge(
    event: PointerEvent<HTMLButtonElement>,
    imageUrl: string,
    axis: "x" | "y",
    delta: number
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    stopImageNudge();
    nudgeGalleryImagePosition(imageUrl, axis, delta);
    imageNudgeIntervalRef.current = window.setInterval(() => {
      nudgeGalleryImagePosition(imageUrl, axis, delta);
    }, 90);
  }

  async function downloadImageToComputer(imageUrl: string, fileName: string) {
    try {
      const response = await fetch(imageUrl);

      if (!response.ok) {
        setStatusMessage("Не удалось скачать изображение.");
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setStatusMessage("Не удалось скачать изображение.");
    }
  }

  async function moveImageFromMainToSpare(imageUrl: string) {
    if (!propertyDraft) {
      return;
    }

    if (propertyDraft.id) {
      const response = await fetch("/api/admin/spare-gallery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ propertyId: propertyDraft.id, imageUrl }),
      });
      const payload = (await response.json()) as {
        error?: string;
        items?: AdminSpareGalleryItem[];
      };

      if (!response.ok) {
        setStatusMessage(payload.error ?? "Не удалось перенести фото в запасную галерею.");
        return;
      }
    }

    const nextDraft = applyGalleryInclusion(propertyDraft, imageUrl, false);

    if (!nextDraft) {
      return;
    }

    setPropertyDraft(nextDraft);
    const saved = await persistImmediateGalleryChange(
      nextDraft,
      "Фотография перенесена из основной галереи в запасную."
    );

    if (saved && nextDraft.id) {
      await loadSpareGallery(nextDraft.id);
    }
  }

  async function deleteImageFromSpareGallery(imageUrl: string) {
    const response = await fetch("/api/admin/spare-gallery", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageUrl }),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setStatusMessage(payload.error ?? "Не удалось удалить фото из запасной галереи.");
      return;
    }

    setSpareGalleryItems((currentItems) =>
      currentItems.filter((item) => item.imageUrl !== imageUrl)
    );
    setStatusMessage("Фотография удалена из запасной галереи.");
  }

  async function generateAiVariants() {
    if (aiSourcePhotos.length === 0) {
      setAiStatus("Перетащите хотя бы одно фото в поле исходников для AI.");
      return;
    }

    if (!selectedId || !propertyDraft?.id) {
      setAiStatus("Сначала сохраните объект, затем запускайте AI-генерацию.");
      return;
    }

    setIsGeneratingAi(true);
    setAiStatus("");

    try {
      const generatedResults: GenerateRoomDesignResult[] = [];

      for (const photo of aiSourcePhotos) {
        const sourceFile = await fetchImageAsFile(
          photo.imageUrl,
          `${photo.id}.jpg`
        );
        const formData = new FormData();
        formData.append("photos", sourceFile, sourceFile.name);
        formData.append("roomType", photo.roomType);
        formData.append("palette", aiPalette);
        formData.append("propertyId", propertyDraft.id);

        const response = await fetch("/api/room-ai/generate", {
          method: "POST",
          body: formData,
        });
        const payload = (await response.json()) as GenerateRoomDesignResult & {
          error?: string;
        };

        if (!response.ok) {
          setAiStatus(payload.error ?? `Ошибка генерации для фото ${photo.name}.`);
          return;
        }

        generatedResults.push(payload);
      }

      await loadSavedAiResults(propertyDraft.id);
      await loadSpareGallery(propertyDraft.id);
      setFreshAiResultUrls(
        generatedResults.flatMap((result) =>
          result.variants.map((variant) => variant.photoImageUrl)
        )
      );
      const totalUsage = generatedResults.reduce<
        NonNullable<GenerateRoomDesignResult["usageEstimate"]>
      >(
        (total, result) => ({
          inputTokens: total.inputTokens + (result.usageEstimate?.inputTokens ?? 0),
          outputTokens: total.outputTokens + (result.usageEstimate?.outputTokens ?? 0),
          totalTokens: total.totalTokens + (result.usageEstimate?.totalTokens ?? 0),
          generatedImages:
            total.generatedImages + (result.usageEstimate?.generatedImages ?? 0),
          estimatedCostUsd:
            total.estimatedCostUsd + (result.usageEstimate?.estimatedCostUsd ?? 0),
          note:
            "Оценка: текстовые токены взяты из usage, стоимость изображения рассчитана по текущему прайсу для 1536x1024 medium.",
        }),
        {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          generatedImages: 0,
          estimatedCostUsd: 0,
          note:
            "Оценка: текстовые токены взяты из usage, стоимость изображения рассчитана по текущему прайсу для 1536x1024 medium.",
        }
      );
      setAiResult((currentResult) =>
        currentResult
          ? { ...currentResult, usageEstimate: totalUsage }
          : generatedResults[generatedResults.length - 1] ?? null
      );
      setAiStatus(
        `AI сгенерировал и сохранил ${aiSourcePhotos.length} ${
          aiSourcePhotos.length === 1 ? "вариант" : "варианта"
        }. ${formatAiGenerationCost(totalUsage)}`
      );
      await loadGenerationBalance();
    } catch {
      setAiStatus("Ошибка генерации вариантов.");
    } finally {
      setIsGeneratingAi(false);
    }
  }

  async function loadSavedAiResults(propertyId: string) {
    try {
      const response = await fetch(
        `/api/room-ai/generate?propertyId=${encodeURIComponent(propertyId)}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as GenerateRoomDesignResult & {
        error?: string;
      };

      setAiResult(payload.variants.length > 0 ? payload : null);
      if (payload.variants.length > 0) {
        setAiStatus("Загружены сохраненные AI-варианты для этого объекта.");
      }
    } catch {
      // Saved AI results are optional; the editor can continue without them.
    }
  }

  async function loadSpareGallery(propertyId: string) {
    try {
      const response = await fetch(
        `/api/admin/spare-gallery?propertyId=${encodeURIComponent(propertyId)}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        items?: AdminSpareGalleryItem[];
      };

      setSpareGalleryItems(payload.items ?? []);
    } catch {
      // Spare gallery is optional; the editor can continue without it.
    }
  }

  async function updateInquiryStatus(
    inquiryId: string,
    status: CustomerInquiry["status"]
  ) {
    const response = await fetch("/api/admin/inquiries", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: inquiryId, status }),
    });

    const payload = (await response.json()) as {
      error?: string;
      inquiries?: CustomerInquiry[];
    };

    if (!response.ok || !payload.inquiries) {
      setStatusMessage(payload.error ?? "Не удалось обновить обращение.");
      return;
    }

    setInquiries(payload.inquiries);
    setStatusMessage("Статус обращения обновлен.");
  }

  function getPropertiesByIds(ids: string[]) {
    return ids
      .map((id) => properties.find((property) => property.id === id))
      .filter((property): property is PropertyListing => Boolean(property));
  }

  function formatAdminDate(isoDate: string) {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(isoDate));
  }

  function formatUserPropertyTypes(propertyTypes?: PropertyType[]) {
    if (!propertyTypes || propertyTypes.length === 0) {
      return "Не указаны";
    }

    return propertyTypes
      .map(
        (propertyType) =>
          extendedPropertyTypeOptions.find((option) => option.value === propertyType)?.label ??
          propertyType
      )
      .join(", ");
  }

  return (
    <main className="site-page-background h-[100dvh] overflow-hidden px-6 text-slate-950">
      <div className="mx-auto flex h-full min-h-0 max-w-[1520px] flex-col py-8">
          <div className="mb-5 shrink-0 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">Панель администратора</h1>
            <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (activeTab === "catalog") {
                  return;
                }

                setActiveTab("catalog");
              }}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                activeTab === "catalog"
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-white text-slate-700"
              }`}
            >
              Каталог и AI
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("inquiries")}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                activeTab === "inquiries"
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-white text-slate-700"
              }`}
            >
              Обращения клиентов
              <span className="ml-2 rounded-full bg-white/15 px-2 py-1 text-xs">
                {inquiries.length}
              </span>
            </button>
              <button
                type="button"
                onClick={() => setActiveTab("users")}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  activeTab === "users"
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-white text-slate-700"
              }`}
            >
              Пользователи
                <span className="ml-2 rounded-full bg-white/15 px-2 py-1 text-xs">
                  {users.length}
                </span>
              </button>
              <Link
                href="/"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
              >
                Каталог сайта
              </Link>
              <button
                type="button"
                onClick={handleAdminLogout}
                className="rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:text-rose-800"
              >
                Выйти
              </button>
            </div>
          </div>

        <div className="sr-only" aria-live="polite">
          {statusMessage}
        </div>

        {isLeaveDialogOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
            <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="text-xl font-semibold text-slate-950">
                Есть несохраненные изменения
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Сохранить изменения перед уходом с текущего объекта?
              </p>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={handleLeaveDialogCancel}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleLeaveDialogDiscard}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                >
                  Не сохранять
                </button>
                <button
                  type="button"
                  onClick={handleLeaveDialogSave}
                  disabled={isSaving}
                  className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "catalog" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="mb-4 shrink-0 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={createProperty}
                disabled={isSaving}
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                Новый объект
              </button>
            </div>

            <div className="grid min-h-0 flex-1 items-start gap-6 overflow-hidden xl:grid-cols-[300px_minmax(0,1fr)]">
              <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 text-sm font-semibold text-slate-950">
                  Каталог: {filteredProperties.length} из {properties.length} объектов
                </div>
                <div className="mb-4 shrink-0 grid gap-3">
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Фильтр
                    </span>
                    <select
                      value={catalogModeFilter}
                      onChange={(event) =>
                        setCatalogModeFilter(event.target.value as AdminCatalogModeFilter)
                      }
                      className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-emerald-500"
                    >
                      <option value="all">Все объекты</option>
                      <option value="sale">Продажа</option>
                      <option value="rent">Аренда</option>
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Поиск по ID
                    </span>
                    <input
                      value={catalogIdQuery}
                      onChange={(event) => setCatalogIdQuery(event.target.value)}
                      placeholder="Например: 1778062918727"
                      className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-emerald-500"
                    />
                  </label>
                </div>
                <div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto pr-1">
                  {filteredProperties.map((property) => {
                    const isActive = property.id === selectedId;

                    return (
                      <button
                        key={property.id}
                        type="button"
                        onClick={() => selectProperty(property)}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          isActive
                            ? "border-emerald-400 bg-emerald-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-950">
                            {property.title}
                          </div>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                              property.isActive === false
                                ? "bg-slate-200 text-slate-600"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {property.isActive === false ? "неактивен" : "активен"}
                          </span>
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                          {getPropertyDisplayId(property)}
                        </div>
                        <div className="mt-2 text-sm text-slate-500">
                          {property.city} · {property.mode === "sale" ? "Продажа" : "Аренда"}
                        </div>
                      </button>
                    );
                  })}
                  {filteredProperties.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      По текущему фильтру ничего не найдено.
                    </div>
                  ) : null}
                </div>
              </aside>

              <div
                ref={catalogContentScrollRef}
                onDragOver={updateDragAutoScroll}
                onDragEnd={stopDragAutoScroll}
                onDrop={stopDragAutoScroll}
                onDragLeave={(event) => {
                  if (event.currentTarget === event.target) {
                    stopDragAutoScroll();
                  }
                }}
                className="h-full min-h-0 overflow-y-auto pr-1"
              >
                <section className="grid gap-6 pb-6">
                <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-slate-950">Объект недвижимости</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {renderCollapseButton("property")}
                      {propertyDraft ? (
                        <>
                          <button
                            type="button"
                            onClick={saveSelectedProperty}
                            disabled={isSaving || !propertyDraft}
                            className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-60"
                          >
                            Сохранить объект
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDraftValue("isActive", propertyDraft.isActive === false)
                            }
                            className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                              propertyDraft.isActive === false
                                ? "border border-emerald-300 bg-emerald-50 text-emerald-900"
                                : "border border-amber-300 bg-amber-50 text-amber-900"
                            }`}
                          >
                            {propertyDraft.isActive === false
                              ? "Сделать активным"
                              : "Снять с публикации"}
                          </button>
                          <button
                            type="button"
                            onClick={openJsonEditor}
                            disabled={!propertyDraft}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800 disabled:opacity-60"
                          >
                            JSON редактор
                          </button>
                          <button
                            type="button"
                            onClick={deleteSelectedProperty}
                            disabled={isSaving || !selectedId}
                            className="rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50 disabled:opacity-60"
                          >
                            Удалить объект
                          </button>
                          {selectedId && propertyDraft.slug ? (
                            <a
                              href={`${getPropertyPublicPath(propertyDraft)}?admin_preview=1`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                            >
                              Открыть объект
                            </a>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>

                  {!isSectionCollapsed("property") ? (
                  propertyDraft ? (
                    <div className="admin-form-shell grid gap-5">
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.7fr)_minmax(180px,0.78fr)_minmax(120px,0.56fr)_minmax(150px,0.72fr)_minmax(140px,0.62fr)]">
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            Заголовок
                          </span>
                          <input
                            value={propertyDraft.title}
                            onChange={(event) => setDraftValue("title", event.target.value)}
                            placeholder="Например: Вилла у океана"
                            className={withChangedFieldClass(
                              "h-11 w-full min-w-0 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-emerald-500",
                              "title"
                            )}
                          />
                        </label>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            Режим
                          </span>
                          <select
                            value={propertyDraft.mode}
                            onChange={(event) =>
                              setDraftValue("mode", event.target.value as PropertyListing["mode"])
                            }
                            className={withChangedFieldClass(
                              "h-11 w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-emerald-500",
                              "mode"
                            )}
                          >
                            <option value="sale">Продажа</option>
                            <option value="rent">Аренда</option>
                          </select>
                        </label>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            Цена
                          </span>
                          <input
                            value={displayDraftNumberValue(propertyDraft.priceAmount, isNewPropertyDraft)}
                            onChange={(event) =>
                              setDraftValue("priceAmount", toNumber(event.target.value))
                            }
                            placeholder="Например: 850000"
                            className={withChangedFieldClass(
                              "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                              "priceAmount"
                            )}
                          />
                        </label>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            Дата публикации
                          </span>
                          <input
                            value={propertyDraft.publishedAt}
                            onChange={(event) =>
                              setDraftValue("publishedAt", event.target.value)
                            }
                            placeholder="2026-05-06"
                            className={withChangedFieldClass(
                              "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                              "publishedAt"
                            )}
                          />
                        </label>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            ID
                          </span>
                          <input
                            value={getPropertyDisplayId(propertyDraft)}
                            readOnly
                            placeholder="После сохранения"
                            className="h-11 w-full min-w-0 rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm text-slate-500 outline-none"
                          />
                        </label>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            Краткое описание
                          </span>
                          <textarea
                            value={propertyDraft.shortDescription}
                            onChange={(event) =>
                              setDraftValue("shortDescription", event.target.value)
                            }
                            placeholder="Кратко опишите объект"
                            className={withChangedFieldClass(
                              "min-h-[92px] rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                              "shortDescription"
                            )}
                          />
                        </label>
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            Полное описание
                          </span>
                          <textarea
                            value={propertyDraft.fullDescription}
                            onChange={(event) =>
                              setDraftValue("fullDescription", event.target.value)
                            }
                            placeholder="Полное описание объекта"
                            className={withChangedFieldClass(
                              "min-h-[92px] rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                              "fullDescription"
                            )}
                          />
                        </label>
                      </div>

                      <div
                        className={
                          showsCompactLayout
                            ? "grid gap-4 md:grid-cols-2 2xl:grid-cols-[minmax(0,0.62fr)_minmax(0,1.55fr)_48px_170px_170px]"
                            : "grid gap-4 md:grid-cols-2 2xl:grid-cols-[minmax(0,0.62fr)_minmax(0,1.45fr)_48px_170px_170px]"
                        }
                      >
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">Город</span>
                          <input
                            value={propertyDraft.city}
                            onChange={(event) => setDraftValue("city", event.target.value)}
                            placeholder="Например: Лиссабон"
                            className={withChangedFieldClass(
                              "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                              "city"
                            )}
                          />
                        </label>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            Адрес
                          </span>
                          <div className="flex gap-2">
                            <input
                              value={propertyDraft.location.addressLabel}
                              onChange={(event) =>
                                setDraftLocationValue("addressLabel", event.target.value)
                              }
                              placeholder="Например: Avenida da Liberdade, Lisbon"
                              className={withChangedFieldClass(
                                "h-11 w-full min-w-0 flex-1 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-emerald-500",
                                "location.addressLabel"
                              )}
                            />
                          </div>
                        </label>
                        <div className="relative min-w-0 md:col-span-2 2xl:col-span-3">
                          {geocodeMessage ? (
                            <div className="absolute -top-5 left-[64px] text-xs text-slate-500">
                              {geocodeMessage}
                            </div>
                          ) : null}
                          <div className="grid grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)] items-end gap-4">
                            <div className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-transparent">.</span>
                              <button
                                type="button"
                                onClick={fillCoordinatesFromAddress}
                                disabled={isGeocodingAddress}
                                title="Заполнить координаты по адресу"
                                className="h-11 w-11 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800 disabled:opacity-60"
                              >
                                {isGeocodingAddress ? "..." : "⌖"}
                              </button>
                            </div>
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Широта
                              </span>
                              <input
                                value={displayDraftNumberValue(propertyDraft.location.latitude, isNewPropertyDraft)}
                                onChange={(event) =>
                                  setDraftLocationValue("latitude", toNumber(event.target.value))
                                }
                                placeholder="0"
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "location.latitude"
                                )}
                              />
                            </label>
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Долгота
                              </span>
                              <input
                                value={displayDraftNumberValue(propertyDraft.location.longitude, isNewPropertyDraft)}
                                onChange={(event) =>
                                  setDraftLocationValue("longitude", toNumber(event.target.value))
                                }
                                placeholder="0"
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "location.longitude"
                                )}
                              />
                            </label>
                          </div>
                        </div>
                        {!showsCompactLayout ? <div className="min-w-0" /> : null}
                      </div>

                      {showsCompactLayout ? (
                        <>
                          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-[minmax(150px,0.76fr)_minmax(190px,0.95fr)_110px_110px_110px_minmax(140px,0.58fr)_110px]">
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Тип объекта
                              </span>
                              <select
                                value={propertyDraft.details.propertyType}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "propertyType",
                                    event.target.value as PropertyType
                                  )
                                }
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "details.propertyType"
                                )}
                              >
                                {extendedPropertyTypeOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Состояние
                              </span>
                              <select
                                value={propertyDraft.details.condition}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "condition",
                                    event.target.value as PropertyCondition
                                  )
                                }
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "details.condition"
                                )}
                              >
                                {propertyConditionOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Год постройки
                              </span>
                              <input
                                value={displayDraftNumberValue(propertyDraft.details.yearBuilt, isNewPropertyDraft)}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "yearBuilt",
                                    toNumber(event.target.value)
                                  )
                                }
                                placeholder="2024"
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "details.yearBuilt"
                                )}
                              />
                            </label>
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Этаж
                              </span>
                              <input
                                value={propertyDraft.details.floor ?? ""}
                                onChange={(event) =>
                                  setDraftDetailsValue("floor", event.target.value)
                                }
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "details.floor"
                                )}
                              />
                            </label>
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Этажность
                              </span>
                              <input
                                value={displayDraftNumberValue(propertyDraft.details.buildingFloors ?? 0, isNewPropertyDraft)}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "buildingFloors",
                                    toNumber(event.target.value)
                                  )
                                }
                                placeholder="0"
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "details.buildingFloors"
                                )}
                              />
                            </label>
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Ориентация
                              </span>
                              <input
                                value={propertyDraft.details.orientation.join(", ")}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "orientation",
                                    parseOrientationValue(event.target.value)
                                  )
                                }
                                placeholder="юг, восток"
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "details.orientation"
                                )}
                              />
                            </label>
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Энергокласс
                              </span>
                              <select
                                value={propertyDraft.details.energyRating}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "energyRating",
                                    event.target.value as EnergyRating
                                  )
                                }
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "details.energyRating"
                                )}
                              >
                                {energyRatingOptions.map((rating) => (
                                  <option key={rating} value={rating}>
                                    {rating}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>

                          <div
                            className={
                              showsCompactAttachedLandLayout
                                ? "grid gap-4 md:grid-cols-2 2xl:grid-cols-[160px_82px_82px_92px_104px_104px_minmax(130px,0.7fr)]"
                                : "grid gap-4 md:grid-cols-2 2xl:grid-cols-[160px_82px_82px_92px_104px_minmax(130px,0.7fr)]"
                            }
                          >
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Ширина/площадь, м²
                              </span>
                              <input
                                value={displayDraftNumberValue(propertyDraft.areaM2, isNewPropertyDraft)}
                                onChange={(event) =>
                                  setDraftValue("areaM2", toNumber(event.target.value))
                                }
                                placeholder="0"
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "areaM2"
                                )}
                              />
                            </label>
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Спальни
                              </span>
                              <input
                                value={displayDraftNumberValue(propertyDraft.bedrooms, isNewPropertyDraft)}
                                onChange={(event) =>
                                  setDraftValue("bedrooms", toNumber(event.target.value))
                                }
                                placeholder="0"
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "bedrooms"
                                )}
                              />
                            </label>
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Ванные
                              </span>
                              <input
                                value={displayDraftNumberValue(propertyDraft.bathrooms, isNewPropertyDraft)}
                                onChange={(event) =>
                                  setDraftValue("bathrooms", toNumber(event.target.value))
                                }
                                placeholder="0"
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "bathrooms"
                                )}
                              />
                            </label>
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Балконов
                              </span>
                              <input
                                value={displayDraftNumberValue(propertyDraft.details.balconyCount, isNewPropertyDraft)}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "balconyCount",
                                    toNumber(event.target.value)
                                  )
                                }
                                placeholder="0"
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "details.balconyCount"
                                )}
                              />
                            </label>
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Парк. мест
                              </span>
                              <input
                                value={displayDraftNumberValue(propertyDraft.details.parkingSpaces, isNewPropertyDraft)}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "parkingSpaces",
                                    toNumber(event.target.value)
                                  )
                                }
                                placeholder="0"
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "details.parkingSpaces"
                                )}
                              />
                            </label>
                            {showsCompactAttachedLandLayout ? (
                              <label className="min-w-0 grid gap-2">
                                <span className="text-sm font-semibold text-slate-800">
                                  Участок, м²
                                </span>
                                <input
                                  value={propertyDraft.details.plotAreaM2 ?? 0}
                                  onChange={(event) =>
                                    setDraftDetailsValue(
                                      "plotAreaM2",
                                      toNumber(event.target.value)
                                    )
                                  }
                                  className={withChangedFieldClass(
                                    "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                    "details.plotAreaM2"
                                  )}
                                />
                              </label>
                            ) : null}
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Отопление
                              </span>
                              <select
                                value={propertyDraft.details.heating}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "heating",
                                    event.target.value as HeatingType
                                  )
                                }
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "details.heating"
                                )}
                              >
                                {heatingOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        </>
                      ) : null}

                      {!showsCompactLayout ? (
                        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-[minmax(0,0.8fr)_minmax(0,0.72fr)_minmax(0,0.4fr)_minmax(0,0.4fr)]">
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            Тип объекта
                          </span>
                          <select
                            value={propertyDraft.details.propertyType}
                            onChange={(event) =>
                              setDraftDetailsValue(
                                "propertyType",
                                event.target.value as PropertyType
                              )
                            }
                            className="w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          >
                            {extendedPropertyTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {isLandProperty ? "Площадь, м²" : "Ширина/площадь, м²"}
                          </span>
                          <input
                            value={propertyDraft.areaM2}
                            onChange={(event) =>
                              setDraftValue("areaM2", toNumber(event.target.value))
                            }
                            className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          />
                        </label>
                        {showsResidentialFields ? (
                          <label className="min-w-0 grid gap-2">
                            <span className="text-sm font-semibold text-slate-800">
                              Спальни
                            </span>
                            <input
                              value={propertyDraft.bedrooms}
                              onChange={(event) =>
                                setDraftValue("bedrooms", toNumber(event.target.value))
                              }
                              className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                            />
                          </label>
                        ) : null}
                        {showsResidentialFields ? (
                          <label className="min-w-0 grid gap-2">
                            <span className="text-sm font-semibold text-slate-800">
                              Ванные
                            </span>
                            <input
                              value={propertyDraft.bathrooms}
                              onChange={(event) =>
                                setDraftValue("bathrooms", toNumber(event.target.value))
                              }
                              className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                            />
                          </label>
                        ) : null}
                        </div>
                      ) : null}

                      {!showsCompactLayout ? (
                        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.5fr)]">
                        {!isLandProperty ? (
                          <label className="min-w-0 grid gap-2">
                            <span className="text-sm font-semibold text-slate-800">
                              Состояние
                            </span>
                            <select
                              value={propertyDraft.details.condition}
                              onChange={(event) =>
                                setDraftDetailsValue(
                                  "condition",
                                  event.target.value as PropertyCondition
                                )
                              }
                              className="w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                            >
                              {propertyConditionOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                        {showsResidentialFields ? (
                          <label className="min-w-0 grid gap-2">
                            <span className="text-sm font-semibold text-slate-800">
                              Парк. мест
                            </span>
                            <input
                              value={propertyDraft.details.parkingSpaces}
                              onChange={(event) =>
                                setDraftDetailsValue(
                                  "parkingSpaces",
                                  toNumber(event.target.value)
                                )
                              }
                              className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                            />
                          </label>
                        ) : null}
                        {!isLandProperty ? (
                          <label className="min-w-0 grid gap-2">
                            <span className="text-sm font-semibold text-slate-800">
                              Год постройки
                            </span>
                            <input
                              value={propertyDraft.details.yearBuilt}
                              onChange={(event) =>
                                setDraftDetailsValue("yearBuilt", toNumber(event.target.value))
                              }
                              className="h-11 w-full min-w-0 max-w-[120px] rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-emerald-500"
                            />
                          </label>
                        ) : null}
                        </div>
                      ) : null}

                      {showsSecondaryAreaFields && !showsCompactLayout ? (
                        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-[minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(0,0.9fr)_minmax(0,0.8fr)]">
                          <label className="min-w-0 grid gap-2">
                            <span className="text-sm font-semibold text-slate-800">
                              Полезная площадь, м²
                            </span>
                            <input
                              value={propertyDraft.details.usableAreaM2}
                              onChange={(event) =>
                                setDraftDetailsValue(
                                  "usableAreaM2",
                                  toNumber(event.target.value)
                                )
                              }
                              className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                            />
                          </label>
                          {!isLandProperty ? (
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Площадь застройки, м²
                              </span>
                              <input
                                value={propertyDraft.details.builtAreaM2}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "builtAreaM2",
                                    toNumber(event.target.value)
                                  )
                                }
                                className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                              />
                            </label>
                          ) : null}
                          {showsPlotAreaField ? (
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Участок, м²
                              </span>
                              <input
                                value={displayDraftNumberValue(propertyDraft.details.plotAreaM2 ?? 0, isNewPropertyDraft)}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "plotAreaM2",
                                    toNumber(event.target.value)
                                  )
                                }
                                placeholder="0"
                                className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                              />
                            </label>
                          ) : null}
                          {!isLandProperty ? (
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Этаж
                              </span>
                              <input
                                value={propertyDraft.details.floor ?? ""}
                                onChange={(event) =>
                                  setDraftDetailsValue("floor", event.target.value)
                                }
                                className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                              />
                            </label>
                          ) : null}
                        </div>
                      ) : null}

                      <div className={showsResidentialFields && !showsCompactLayout ? "grid gap-4 md:grid-cols-2 2xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.72fr)_minmax(0,0.9fr)_minmax(0,0.6fr)]" : "hidden"}>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            Отопление
                          </span>
                          <select
                            value={propertyDraft.details.heating}
                            onChange={(event) =>
                              setDraftDetailsValue(
                                "heating",
                                event.target.value as HeatingType
                              )
                            }
                            className="w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          >
                            {heatingOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            Энергокласс
                          </span>
                          <select
                            value={propertyDraft.details.energyRating}
                            onChange={(event) =>
                              setDraftDetailsValue(
                                "energyRating",
                                event.target.value as EnergyRating
                              )
                            }
                            className="w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          >
                            {energyRatingOptions.map((rating) => (
                              <option key={rating} value={rating}>
                                {rating}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            Ориентация
                          </span>
                          <input
                            value={propertyDraft.details.orientation.join(", ")}
                            onChange={(event) =>
                              setDraftDetailsValue(
                                "orientation",
                                parseOrientationValue(event.target.value)
                              )
                            }
                            placeholder="юг, восток"
                            className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          />
                        </label>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            Этажность
                          </span>
                          <input
                            value={propertyDraft.details.buildingFloors ?? 0}
                            onChange={(event) =>
                              setDraftDetailsValue(
                                "buildingFloors",
                                toNumber(event.target.value)
                              )
                            }
                            className="w-full min-w-0 max-w-[120px] rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          />
                        </label>
                      </div>

                      <div className={showsResidentialFields && !showsCompactLayout ? "grid gap-4 md:grid-cols-2 2xl:grid-cols-[repeat(4,minmax(0,0.58fr))]" : "hidden"}>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            Полных ванных
                          </span>
                          <input
                            value={propertyDraft.details.bathroomsFull}
                            onChange={(event) =>
                              setDraftDetailsValue(
                                "bathroomsFull",
                                toNumber(event.target.value)
                              )
                            }
                            className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          />
                        </label>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            Гостевых санузлов
                          </span>
                          <input
                            value={propertyDraft.details.guestBathrooms ?? 0}
                            onChange={(event) =>
                              setDraftDetailsValue(
                                "guestBathrooms",
                                toNumber(event.target.value)
                              )
                            }
                            className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          />
                        </label>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            Балконов
                          </span>
                          <input
                            value={propertyDraft.details.balconyCount}
                            onChange={(event) =>
                              setDraftDetailsValue(
                                "balconyCount",
                                toNumber(event.target.value)
                              )
                            }
                            className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          />
                        </label>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            Террас
                          </span>
                          <input
                            value={propertyDraft.details.terraceCount}
                            onChange={(event) =>
                              setDraftDetailsValue(
                                "terraceCount",
                                toNumber(event.target.value)
                              )
                            }
                            className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          />
                        </label>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-sm font-semibold text-slate-900">Особенности</div>
                        <div className={featureGridClass}>
                          {visibleFeatureOptions.map((feature) => (
                            <label
                              key={`${feature.source}-${feature.value}`}
                              className={withChangedBlockClass(
                                `inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white text-slate-700 ${
                                  showsCompactLayout
                                    ? "px-3 py-2 text-[13px]"
                                    : "px-4 py-3 text-sm"
                                }`,
                                isFeatureOptionChanged(feature)
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isFeatureOptionChecked(feature)}
                                onChange={() => toggleFeatureOption(feature)}
                                className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                              />
                              {showsCompactLayout
                                ? feature.compactLabel ?? feature.label
                                : feature.label}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-900">
                            Транспортная доступность
                          </div>
                          <button
                            type="button"
                            onClick={addTransportRoute}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                          >
                            Добавить маршрут
                          </button>
                        </div>
                        <div className="grid gap-2">
                          {propertyDraft.transportAccess.map((route, index) => (
                            <div
                              key={`transport-route-${index}`}
                              className={withChangedBlockClass(
                                "grid gap-2 rounded-2xl border border-slate-200 bg-white p-2 lg:grid-cols-[0.82fr_0.96fr_1fr_0.92fr_auto]",
                                isTransportRouteChanged(index)
                              )}
                            >
                              <select
                                value={route.mode}
                                onChange={(event) =>
                                  setDraftTransportValue(
                                    index,
                                    "mode",
                                    event.target.value as TransportMode
                                  )
                                }
                                className={withChangedFieldClass(
                                  "h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500",
                                  `transportAccess.${index}.mode`
                                )}
                              >
                                {transportModeOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={route.route}
                                onChange={(event) =>
                                  setDraftTransportValue(index, "route", event.target.value)
                                }
                                placeholder="726, 728, 731"
                                className={withChangedFieldClass(
                                  "h-10 rounded-2xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500",
                                  `transportAccess.${index}.route`
                                )}
                              />
                              <input
                                type="text"
                                value={route.stopName}
                                onChange={(event) =>
                                  setDraftTransportValue(index, "stopName", event.target.value)
                                }
                                placeholder="Остановка"
                                className={withChangedFieldClass(
                                  "h-10 rounded-2xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500",
                                  `transportAccess.${index}.stopName`
                                )}
                              />
                              <input
                                value={route.walkMinutes}
                                onChange={(event) =>
                                  setDraftTransportValue(
                                    index,
                                    "walkMinutes",
                                    toNumber(event.target.value)
                                  )
                                }
                                placeholder="5 минут пешком"
                                className={withChangedFieldClass(
                                  "h-10 rounded-2xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500",
                                  `transportAccess.${index}.walkMinutes`
                                )}
                              />
                              <button
                                type="button"
                                onClick={() => removeTransportRoute(index)}
                                className="h-10 rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50"
                              >
                                Удалить
                              </button>
                            </div>
                          ))}
                          {propertyDraft.transportAccess.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                              Пока нет маршрутов.
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {propertyDraft.mode === "sale" ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="mb-3 text-sm font-semibold text-slate-900">
                            Налоги и оформление
                          </div>
                          <div className="grid gap-4 lg:grid-cols-3">
                            <label className="grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                IMT
                              </span>
                              <input
                                value={propertyDraft.taxProfile?.propertyTransferTaxRate ?? 0}
                                onChange={(event) =>
                                  setDraftTaxValue(
                                    "propertyTransferTaxRate",
                                    toNumber(event.target.value)
                                  )
                                }
                                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                              />
                            </label>
                            <label className="grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Гербовый сбор
                              </span>
                              <input
                                value={propertyDraft.taxProfile?.stampDutyRate ?? 0}
                                onChange={(event) =>
                                  setDraftTaxValue(
                                    "stampDutyRate",
                                    toNumber(event.target.value)
                                  )
                                }
                                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                              />
                            </label>
                            <label className="grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Нотариус и регистрация
                              </span>
                              <input
                                value={propertyDraft.taxProfile?.notaryEstimateRate ?? 0}
                                onChange={(event) =>
                                  setDraftTaxValue(
                                    "notaryEstimateRate",
                                    toNumber(event.target.value)
                                  )
                                }
                                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                              />
                            </label>
                          </div>
                        </div>
                      ) : null}

                      <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              Текущие фотографии объекта
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Перетащите, чтобы изменить порядок или убрать в запасные.
                            </div>
                          </div>
                          {renderCollapseButton("photos")}
                        </div>
                        {!isSectionCollapsed("photos") ? (
                        <>
                        <div
                          className="mt-3 flex max-w-full gap-3 overflow-x-auto pb-3"
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            void handleMainGalleryDrop(event);
                          }}
                        >
                          {propertyDraft.imageGallery.length > 0 ? (
                            propertyDraft.imageGallery.map((imageUrl, index) => {
                              return (
                              <div
                                key={imageUrl}
                                draggable
                                onDragStart={(event) =>
                                  writeGalleryDragData(event, imageUrl, "main")
                                }
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={(event) => {
                                  event.stopPropagation();
                                  void handleMainGalleryDrop(event, imageUrl);
                                }}
                                className={withChangedBlockClass(
                                  `w-[280px] shrink-0 cursor-grab overflow-hidden rounded-2xl border bg-white active:cursor-grabbing sm:w-[300px] ${
                                    propertyDraft.imageUrl === imageUrl
                                      ? "border-amber-400 ring-2 ring-amber-200"
                                      : "border-slate-200"
                                  }`,
                                  isGalleryImageChanged(imageUrl, index)
                                )}
                              >
                                <div className="relative">
                                  <img
                                    src={imageUrl}
                                    alt={propertyDraft.title}
                                    className="h-40 w-full object-cover"
                                    style={{
                                      objectPosition: getPropertyImagePosition(
                                        propertyDraft,
                                        imageUrl
                                      ),
                                    }}
                                  />
                                  <div className="absolute left-2 top-2 rounded-full bg-slate-950/80 px-2 py-1 text-xs font-semibold text-white">
                                    {index + 1}
                                  </div>
                                  {propertyDraft.imageUrl === imageUrl ? (
                                    <div className="absolute right-2 top-2 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
                                      Обложка
                                    </div>
                                  ) : null}
                                  {isAiGeneratedImage(imageUrl) ? (
                                    <div className="absolute bottom-2 left-2 rounded-full bg-slate-950/80 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                                      AI
                                    </div>
                                  ) : null}
                                  <div className="absolute bottom-2 left-1/2 grid -translate-x-1/2 grid-cols-3 gap-0.5 rounded-xl bg-slate-950/20 p-1 text-white opacity-45 shadow-sm transition hover:bg-slate-950/45 hover:opacity-100">
                                    <span />
                                    <button
                                      type="button"
                                      draggable={false}
                                      title="Сдвинуть фото вверх"
                                      aria-label="Сдвинуть фото вверх"
                                      onPointerDown={(event) =>
                                        startImageNudge(event, imageUrl, "y", -2)
                                      }
                                      onPointerUp={stopImageNudge}
                                      onPointerCancel={stopImageNudge}
                                      onPointerLeave={stopImageNudge}
                                      onClick={(event) => event.preventDefault()}
                                      className="grid h-6 w-6 touch-none select-none place-items-center rounded-full bg-white/10 text-xs font-bold transition hover:bg-white/35"
                                    >
                                      ↑
                                    </button>
                                    <span />
                                    <button
                                      type="button"
                                      draggable={false}
                                      title="Сдвинуть фото влево"
                                      aria-label="Сдвинуть фото влево"
                                      onPointerDown={(event) =>
                                        startImageNudge(event, imageUrl, "x", -2)
                                      }
                                      onPointerUp={stopImageNudge}
                                      onPointerCancel={stopImageNudge}
                                      onPointerLeave={stopImageNudge}
                                      onClick={(event) => event.preventDefault()}
                                      className="grid h-6 w-6 touch-none select-none place-items-center rounded-full bg-white/10 text-xs font-bold transition hover:bg-white/35"
                                    >
                                      ←
                                    </button>
                                    <span className="h-6 w-6" />
                                    <button
                                      type="button"
                                      draggable={false}
                                      title="Сдвинуть фото вправо"
                                      aria-label="Сдвинуть фото вправо"
                                      onPointerDown={(event) =>
                                        startImageNudge(event, imageUrl, "x", 2)
                                      }
                                      onPointerUp={stopImageNudge}
                                      onPointerCancel={stopImageNudge}
                                      onPointerLeave={stopImageNudge}
                                      onClick={(event) => event.preventDefault()}
                                      className="grid h-6 w-6 touch-none select-none place-items-center rounded-full bg-white/10 text-xs font-bold transition hover:bg-white/35"
                                    >
                                      →
                                    </button>
                                    <span />
                                    <button
                                      type="button"
                                      draggable={false}
                                      title="Сдвинуть фото вниз"
                                      aria-label="Сдвинуть фото вниз"
                                      onPointerDown={(event) =>
                                        startImageNudge(event, imageUrl, "y", 2)
                                      }
                                      onPointerUp={stopImageNudge}
                                      onPointerCancel={stopImageNudge}
                                      onPointerLeave={stopImageNudge}
                                      onClick={(event) => event.preventDefault()}
                                      className="grid h-6 w-6 touch-none select-none place-items-center rounded-full bg-white/10 text-xs font-bold transition hover:bg-white/35"
                                    >
                                      ↓
                                    </button>
                                    <span />
                                  </div>
                                </div>
                                <div className="p-3">
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setCoverImage(imageUrl)}
                                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                                        propertyDraft.imageUrl === imageUrl
                                          ? "border-amber-200 bg-amber-50 text-amber-800"
                                          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-800"
                                      }`}
                                    >
                                      {propertyDraft.imageUrl === imageUrl
                                        ? "Текущая обложка"
                                        : "Сделать обложкой"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                              );
                            })
                          ) : (
                            <div className="min-w-[260px] rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                              У объекта пока нет фотографий.
                            </div>
                          )}
                        </div>
                        <div
                          className="mt-4 min-w-0 border-t border-slate-200 pt-4"
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            void handleSpareGalleryDrop(event);
                          }}
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-slate-900">
                              Запасная галерея
                            </div>
                            <div className="text-xs text-slate-500">
                              Перетащите сюда из основной или перетащите фото обратно в основную
                            </div>
                          </div>
                          {spareGalleryItems.length > 0 ? (
                            <div className="flex max-w-full gap-3 overflow-x-auto pb-2">
                              {spareGalleryItems.map((item) => (
                                <div
                                  key={item.id}
                                  draggable
                                  onDragStart={(event) =>
                                    writeGalleryDragData(event, item.imageUrl, "spare")
                                  }
                                  className="group w-[108px] shrink-0 cursor-grab overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-400 hover:ring-2 hover:ring-emerald-200 active:cursor-grabbing"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void addImageFromSpareToGallery(item.imageUrl);
                                    }}
                                    title="Перенести в основную галерею"
                                    className="relative block h-[66px] w-full cursor-grab active:cursor-grabbing"
                                  >
                                    {item.source === "ai" ? (
                                      <span className="absolute bottom-1 left-1 rounded-full bg-slate-950/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white">
                                        AI
                                      </span>
                                    ) : null}
                                    <img
                                      src={item.imageUrl}
                                      alt={item.title}
                                      className="h-full w-full object-cover"
                                    />
                                  </button>
                                  <div className="flex justify-center gap-2 px-1 py-1.5">
                                    <button
                                      type="button"
                                      title="Скачать"
                                      aria-label="Скачать"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void downloadImageToComputer(item.imageUrl, `${item.id}.jpg`);
                                      }}
                                      className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                                    >
                                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                                        <path
                                          d="M12 3v10.2m0 0 3.6-3.6M12 13.2 8.4 9.6M5 16.5V20h14v-3.5"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                        />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      title="Удалить"
                                      aria-label="Удалить"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void deleteImageFromSpareGallery(item.imageUrl);
                                      }}
                                      className="grid h-7 w-7 place-items-center rounded-full border border-red-200 bg-white text-red-700 transition hover:bg-red-50"
                                    >
                                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                                        <path
                                          d="M4 7h16M10 11v6m4-6v6M9 7l.5-3h5L15 7m-8 0 1 13h8l1-13"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">
                              Запасная галерея пока пустая.
                            </div>
                          )}
                          <label className="mt-4 grid gap-2">
                            <span className="text-sm font-semibold text-slate-800">
                              Загрузка фотографий
                            </span>
                            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-5">
                              <div className="flex flex-wrap items-center gap-4">
                                <button
                                  type="button"
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                  }}
                                  onClick={() => {
                                    openPhotoPicker();
                                  }}
                                  className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                                >
                                  Выбрать файлы
                                </button>
                                <span className="text-sm text-slate-600">
                                  {uploadedPhotos.length > 0
                                    ? `Загружено фото: ${uploadedPhotos.length}`
                                    : "Можно загрузить одно или несколько фото"}
                                </span>
                                <input
                                  ref={photoFileInputRef}
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={handlePhotoUpload}
                                  tabIndex={-1}
                                  aria-hidden="true"
                                  className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
                                />
                              </div>
                            </div>
                          </label>
                        </div>
                        </>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      Выберите объект слева или создайте новый.
                    </div>
                  )
                  ) : null}
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">
                        Фотографии и AI-варианты
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Загружайте фото, отмечайте нужные кадры для очистки и генерации,
                        затем переносите лучшие варианты в фотографии объекта.
                      </div>
                    </div>
                    {renderCollapseButton("ai")}
                  </div>

                  {!isSectionCollapsed("ai") ? (
                  <div className="grid items-start gap-5 lg:grid-cols-[1fr_1fr]">
                    <div className="grid self-start gap-4">
                      <div className="grid gap-2">
                        <div className="text-sm font-semibold text-slate-800">
                          Исходники для AI
                        </div>
                        <div
                          className="min-h-[132px] rounded-3xl border border-dashed border-emerald-300 bg-emerald-50/50 p-4"
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={handleAiSourceDrop}
                        >
                          {aiSourcePhotos.length > 0 ? (
                            <div className="flex gap-3 overflow-x-auto pb-1">
                              {aiSourcePhotos.map((photo) => (
                                <div
                                  key={photo.id}
                                  className="w-[132px] shrink-0 overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm"
                                >
                                  <img
                                    src={photo.imageUrl}
                                    alt={photo.name}
                                    className="h-20 w-full object-cover"
                                  />
                                  <div className="grid gap-2 p-2">
                                    <select
                                      value={photo.roomType}
                                      onChange={(event) =>
                                        setAiSourceRoomType(
                                          photo.id,
                                          event.target.value as RoomType
                                        )
                                      }
                                      className="h-8 rounded-xl border border-slate-200 bg-white px-2 text-xs outline-none focus:border-emerald-500"
                                    >
                                      {roomTypeOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => removeAiSourcePhoto(photo.imageUrl)}
                                      className="rounded-xl border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-red-200 hover:text-red-700"
                                    >
                                      Убрать
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex h-full min-h-[96px] items-center justify-center text-center text-sm text-slate-500">
                              Перетащите сюда фото из основной или запасной галереи
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-1">
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            Палитра
                          </span>
                          <select
                            value={aiPalette}
                            onChange={(event) =>
                              setAiPalette(
                                event.target.value as (typeof paletteOptions)[number]["value"]
                              )
                            }
                            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          >
                            {paletteOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={generateAiVariants}
                        disabled={isGeneratingAi}
                        className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                      >
                        {isGeneratingAi
                          ? "Генерируем вариант..."
                          : "Сгенерировать мебель"}
                      </button>

                      {aiStatus ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                          {aiStatus}
                        </div>
                      ) : null}

                      {generationBalance ? (
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-950">
                          <div className="font-semibold">
                            Накопленный баланс генераций: {formatUsd(generationBalance.totalCostUsd)}
                          </div>
                          <div className="mt-1 text-xs text-emerald-900/80">
                            Токены: {generationBalance.totalTokens.toLocaleString("ru-RU")}
                            {" "}· Изображений: {generationBalance.totalImages}
                            {" "}· Записей: {generationBalance.entriesCount}
                          </div>
                        </div>
                      ) : null}

                      <div className="grid gap-3">
                        {uploadedPhotos.map((photo) => (
                          <div
                            key={photo.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="flex gap-3">
                              <img
                                src={photo.previewUrl}
                                alt={photo.name}
                                className="h-24 w-24 rounded-2xl object-cover"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="line-clamp-2 text-sm font-semibold text-slate-900">
                                  {photo.name}
                                </div>
                                <label className="mt-3 grid gap-2">
                                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                    Тип комнаты
                                  </span>
                                  <select
                                    value={photo.roomType}
                                    onChange={(event) =>
                                      setPhotoRoomType(photo.id, event.target.value as RoomType)
                                    }
                                    className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500"
                                  >
                                    {roomTypeOptions.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                                  <div className="text-sm text-slate-600">
                                    Фото сохранено в запасную галерею. Перетащите его в поле исходников для AI или в основную галерею.
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid self-start gap-3">
                      <div className="text-sm font-semibold text-slate-800">
                        Сгенерированный вариант
                      </div>
                      {visibleAiVariants.length > 0 ? (
                        <div className="grid gap-4">
                          {visibleAiVariants.map((variant) => (
                            <article
                              key={variant.id}
                              draggable
                              onDragStart={(event) =>
                                writeGalleryDragData(event, variant.photoImageUrl, "ai-result")
                              }
                              className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm cursor-grab active:cursor-grabbing"
                            >
                              <div className="relative">
                                <span className="absolute bottom-3 left-3 z-10 rounded-full bg-slate-950/80 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                                  AI
                                </span>
                                <img
                                  src={variant.photoImageUrl}
                                  alt={variant.title}
                                  draggable={false}
                                  onDragStart={(event) => {
                                    event.preventDefault();
                                  }}
                                  className="h-[320px] w-full cursor-grab object-cover active:cursor-grabbing"
                                />
                              </div>
                              <div className="grid gap-3 p-4">
                                <div>
                                  <div className="text-base font-semibold text-slate-950">
                                    {variant.title}
                                  </div>
                                  <div className="mt-1 text-sm text-slate-600">
                                    Перетащите изображение в основную галерею, если вариант подходит.
                                  </div>
                                </div>
                                {aiResult?.usageEstimate ? (
                                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                                    {formatAiGenerationCost(aiResult.usageEstimate)}
                                  </div>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadImageToComputer(
                                      variant.photoImageUrl,
                                      `${variant.id}.jpg`
                                    )
                                  }
                                  className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                                >
                                  Скачать
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                          Здесь появится крупный результат генерации. Его можно будет перетащить в основную галерею.
                        </div>
                      )}
                    </div>
                  </div>
                  ) : null}
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">
                        GIF превращения объекта
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Соберите лёгкую GIF-анимацию: исходный вид, плавное превращение и финальный AI-результат.
                      </div>
                    </div>
                    {renderCollapseButton("gif")}
                  </div>

                  {!isSectionCollapsed("gif") ? (
                    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                      <div className="grid gap-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          {([
                            ["start", "Стартовое фото", gifStartImageUrl],
                            ["finish", "Финальное фото", gifFinishImageUrl],
                          ] as Array<[GifImageSlot, string, string]>).map(
                            ([slot, label, imageUrl]) => (
                              <div key={slot} className="grid gap-2">
                                <div className="text-sm font-semibold text-slate-800">
                                  {label}
                                </div>
                                <div
                                  onDragOver={(event) => event.preventDefault()}
                                  onDrop={(event) => handleGifImageDrop(event, slot)}
                                  className="flex min-h-[210px] items-center justify-center overflow-hidden rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-center text-sm text-slate-500"
                                >
                                  {imageUrl ? (
                                    <img
                                      src={imageUrl}
                                      alt={label}
                                      className="h-full min-h-[210px] w-full object-cover"
                                    />
                                  ) : (
                                    <span className="px-5">
                                      Перетащите сюда фото из основной, запасной или AI-галереи
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          )}
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                          <label className="grid gap-2">
                            <span className="text-sm font-semibold text-slate-800">
                              Показ исходника, сек.
                            </span>
                            <input
                              type="number"
                              min="0.2"
                              max="10"
                              step="0.1"
                              value={gifStartSeconds}
                              onChange={(event) =>
                                setGifStartSeconds(Number(event.target.value))
                              }
                              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                            />
                          </label>
                          <label className="grid gap-2">
                            <span className="text-sm font-semibold text-slate-800">
                              Превращение, сек.
                            </span>
                            <input
                              type="number"
                              min="0.2"
                              max="10"
                              step="0.1"
                              value={gifTransitionSeconds}
                              onChange={(event) =>
                                setGifTransitionSeconds(Number(event.target.value))
                              }
                              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                            />
                          </label>
                          <label className="grid gap-2">
                            <span className="text-sm font-semibold text-slate-800">
                              Показ результата, сек.
                            </span>
                            <input
                              type="number"
                              min="0.2"
                              max="10"
                              step="0.1"
                              value={gifFinishSeconds}
                              onChange={(event) =>
                                setGifFinishSeconds(Number(event.target.value))
                              }
                              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                            />
                          </label>
                        </div>

                        <button
                          type="button"
                          onClick={generateTransitionGif}
                          disabled={isGeneratingGif}
                          className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                        >
                          {isGeneratingGif ? "Генерируем GIF..." : "Сгенерировать GIF"}
                        </button>

                        {gifStatus ? (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                            {gifStatus}
                          </div>
                        ) : null}
                      </div>

                      <div className="grid self-start gap-3">
                        <div className="text-sm font-semibold text-slate-800">
                          Готовая GIF
                        </div>
                        {gifResult ? (
                          <div
                            draggable
                            onDragStart={(event) =>
                              writeGalleryDragData(event, gifResult.gifUrl, "gif-result")
                            }
                            className="cursor-grab overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm active:cursor-grabbing"
                          >
                            <img
                              src={gifResult.gifUrl}
                              alt="GIF превращения объекта"
                              draggable={false}
                              onDragStart={(event) => {
                                event.preventDefault();
                              }}
                              className="h-[320px] w-full object-cover"
                            />
                            <div className="grid gap-3 p-4">
                              <div className="text-sm text-slate-600">
                                <div>Размер: {formatBytes(gifResult.sizeBytes)}</div>
                                <div>Стоимость генерации: {formatUsd(gifResult.estimatedCostUsd)}</div>
                                <div className="text-xs text-slate-500">{gifResult.note}</div>
                              </div>
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="text-xs text-slate-500">
                                  Перетащите GIF в основную или запасную галерею.
                                </div>
                                <a
                                  href={gifResult.gifUrl}
                                  download
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                                >
                                  Скачать GIF
                                </a>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                            Здесь появится готовая GIF для сайта агентства.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          </div>
        </div>
        ) : activeTab === "inquiries" ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4">
              <div className="text-sm font-semibold text-slate-950">
                Полученные обращения клиентов
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Здесь видны все заявки, отправленные с общей формы подбора и из
                карточек объектов.
              </div>
            </div>

            <div className="grid gap-4">
              {inquiries.length > 0 ? (
                inquiries.map((inquiry) => {
                  const linkedUser = inquiry.userId
                    ? usersById.get(inquiry.userId) ?? null
                    : null;
                  const visibleInquiryEmail = inquiry.email ?? linkedUser?.email ?? null;

                  return (
                    <article
                      key={inquiry.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                        <div className="text-sm font-semibold text-slate-950">
                          {inquiry.source === "property_request"
                            ? "Обращение по объекту"
                            : "Общий запрос на подбор"}
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                          {new Date(inquiry.createdAt).toLocaleString("ru-RU")}
                        </div>
                      </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {linkedUser ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUserId(linkedUser.id);
                                setActiveTab("users");
                              }}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                            >
                              Открыть пользователя
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() =>
                              updateInquiryStatus(
                                inquiry.id,
                                inquiry.status === "new" ? "reviewed" : "new"
                              )
                            }
                            className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                              inquiry.status === "new"
                                ? "border border-amber-300 bg-amber-50 text-amber-900"
                                : "border border-emerald-300 bg-emerald-50 text-emerald-900"
                            }`}
                          >
                            {inquiry.status === "new"
                              ? "Пометить просмотренным"
                              : "Вернуть в новые"}
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
                          <div>
                            <span className="font-semibold">Телефон:</span> {inquiry.phone}
                          </div>
                          {visibleInquiryEmail ? (
                            <div className="mt-1">
                              <span className="font-semibold">Email:</span> {visibleInquiryEmail}
                            </div>
                          ) : null}
                          <div className="mt-1">
                            <span className="font-semibold">Мессенджеры:</span>{" "}
                            {inquiry.messengers.join(", ") || "-"}
                          </div>
                          {inquiry.name ? (
                            <div className="mt-1">
                              <span className="font-semibold">Имя:</span> {inquiry.name}
                            </div>
                          ) : null}
                        </div>

                        <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
                          {linkedUser ? (
                            <div>
                              <span className="font-semibold">Пользователь:</span>{" "}
                              {linkedUser.email}
                            </div>
                          ) : null}
                          {inquiry.propertyTitle ? (
                            <div className={linkedUser ? "mt-1" : undefined}>
                              <span className="font-semibold">Объект:</span>{" "}
                              {inquiry.propertyTitle}
                            </div>
                          ) : null}
                          {inquiry.location ? (
                            <div className="mt-1">
                              <span className="font-semibold">Локация:</span>{" "}
                              {inquiry.location}
                            </div>
                          ) : null}
                          {inquiry.areaAndTypology ? (
                            <div className="mt-1">
                              <span className="font-semibold">Площадь и типология:</span>{" "}
                              {inquiry.areaAndTypology}
                            </div>
                          ) : null}
                          {inquiry.searchType ? (
                            <div className="mt-1">
                              <span className="font-semibold">Что необходимо:</span>{" "}
                              {inquiry.searchType}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {inquiry.message ? (
                        <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-700">
                          <span className="font-semibold">Сообщение:</span> {inquiry.message}
                        </div>
                      ) : null}
                    </article>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Пока нет обращений с сайта.
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="grid min-h-0 flex-1 items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="flex min-h-0 flex-col rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold text-slate-950">
                Зарегистрированные пользователи: {users.length}
              </div>
              <div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto pr-1">
                {users.map((user) => {
                  const isActive = user.id === selectedUserId;

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        isActive
                          ? "border-emerald-400 bg-emerald-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-950">
                          {user.email}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          Регистрация: {formatAdminDate(user.createdAt)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="grid min-h-0 gap-6 overflow-y-auto pr-1">
              {selectedUser ? (
                <>
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="text-2xl font-semibold text-slate-950">
                          {selectedUser.email}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          Пользователь сайта
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        Последняя активность: {formatAdminDate(selectedUser.lastActiveAt)}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Email
                        </div>
                        <div className="mt-2 text-base font-semibold text-slate-950">
                          {selectedUser.email}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Регистрация
                        </div>
                        <div className="mt-2 text-base font-semibold text-slate-950">
                          {formatAdminDate(selectedUser.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="text-lg font-semibold text-slate-950">
                      Что искал пользователь
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Города
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-700">
                          {selectedUser.searchProfile?.cities?.join(", ") ?? "Не указаны"}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Тип объекта
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-700">
                          {formatUserPropertyTypes(selectedUser.searchProfile?.propertyTypes)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Бюджет
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-700">
                          {selectedUser.searchProfile?.budgetLabel ?? "Не указан"}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Ключевые пожелания
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-700">
                          {selectedUser.searchProfile?.mustHave?.join(", ") ?? "Не указаны"}
                        </div>
                      </div>
                    </div>
                    {selectedUser.searchProfile?.notes ? (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                        {selectedUser.searchProfile.notes}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 text-lg font-semibold text-slate-950">
                        Избранное
                      </div>
                      <div className="grid gap-3">
                        {getPropertiesByIds(selectedUser.favoriteIds).map((property) => (
                          <div
                            key={`favorite-${property.id}`}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-base font-semibold text-slate-950">
                                  {property.title}
                                </div>
                                <div className="mt-1 text-sm text-slate-500">
                                  {property.city} · {property.priceLabel}
                                </div>
                              </div>
                              <a
                                href={getPropertyPublicPath(property)}
                                target="_blank"
                                rel="noreferrer"
                                className="shrink-0 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                              >
                                Открыть карточку
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 text-lg font-semibold text-slate-950">
                        Список сравнения
                      </div>
                      <div className="grid gap-3">
                        {getPropertiesByIds(selectedUser.compareIds).map((property) => (
                          <div
                            key={`compare-${property.id}`}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-base font-semibold text-slate-950">
                                  {property.title}
                                </div>
                                <div className="mt-1 text-sm text-slate-500">
                                  {property.city} · {property.priceLabel}
                                </div>
                              </div>
                              <a
                                href={getPropertyPublicPath(property)}
                                target="_blank"
                                rel="noreferrer"
                                className="shrink-0 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                              >
                                Открыть карточку
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Пользователи пока не найдены.
                </div>
              )}
            </section>
          </section>
        )}

        {isJsonEditorOpen && propertyDraft ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
            <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-950">
                    JSON редактор объекта
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Редактируется только текущий объект: {getPropertyDisplayId(propertyDraft)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800">
                    Импорт JSON
                    <input
                      type="file"
                      accept="application/json"
                      className="hidden"
                      onChange={handleImportFile}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={exportJson}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                  >
                    Экспорт JSON
                  </button>
                  <button
                    type="button"
                    onClick={saveJsonEditor}
                    className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Сохранить JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsJsonEditorOpen(false)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                  >
                    Закрыть
                  </button>
                </div>
              </div>

              <textarea
                value={jsonEditorValue}
                onChange={(event) => setJsonEditorValue(event.target.value)}
                className="min-h-[68vh] w-full rounded-[24px] border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 outline-none focus:border-emerald-500"
                spellCheck={false}
              />
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
