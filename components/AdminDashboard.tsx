"use client";

import type { ChangeEvent } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

function createPropertyTemplate(): PropertyListing {
  const now = new Date().toISOString().slice(0, 10);
  const placeholderImage =
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80";

  return {
    id: "",
    slug: "",
    isActive: true,
    mode: "sale",
    title: "Новый объект",
    city: "Лиссабон",
    district: "Centro",
    country: "Португалия",
    location: {
      addressLabel: "Lisbon, Portugal",
      latitude: 38.7223,
      longitude: -9.1393,
      googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=38.7223,-9.1393",
    },
    priceAmount: 0,
    priceLabel: "€0",
    shortDescription: "Краткое описание объекта.",
    fullDescription: "Полное описание объекта.",
    bedrooms: 1,
    bathrooms: 1,
    areaM2: 50,
    imageUrl: placeholderImage,
    imageGallery: [placeholderImage],
    features: ["city_center"],
    details: {
      propertyType: "apartment",
      usableAreaM2: 45,
      builtAreaM2: 50,
      floor: "1 этаж",
      exterior: true,
      elevator: false,
      parkingSpaces: 0,
      storageRoom: false,
      builtInWardrobes: false,
      equippedKitchen: true,
      furnished: false,
      balconyCount: 0,
      terraceCount: 0,
      condition: "good",
      yearBuilt: 2020,
      heating: "electric",
      accessibilityAdapted: false,
      orientation: ["юг"],
      energyRating: "B",
      bathroomsFull: 1,
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
  return `irina-${Date.now()}`;
}

function slugifyValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function buildPropertySlug(title: string, id: string) {
  const titlePart = slugifyValue(title) || "property";
  const idPart = slugifyValue(id) || buildGeneratedPropertyId();
  return `${titlePart}-${idPart}`;
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
  const [activeTab, setActiveTab] = useState<AdminTab>("catalog");
  const [properties, setProperties] = useState<PropertyListing[]>(initialProperties);
  const [inquiries, setInquiries] = useState<CustomerInquiry[]>(initialInquiries);
  const [users] = useState<RegisteredUser[]>(initialUsers);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    initialUsers[0]?.id ?? null
  );
  const catalogContentScrollRef = useRef<HTMLDivElement | null>(null);
  const photoFileInputRef = useRef<HTMLInputElement | null>(null);
  const photoPickerScrollStateRef = useRef<{
    panelScrollTop: number;
    windowScrollX: number;
    windowScrollY: number;
  } | null>(null);

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
  const [aiPalette, setAiPalette] =
    useState<(typeof paletteOptions)[number]["value"]>("light");
  const [aiResult, setAiResult] = useState<GenerateRoomDesignResult | null>(null);
  const [aiStatus, setAiStatus] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isJsonEditorOpen, setIsJsonEditorOpen] = useState(false);
  const [jsonEditorValue, setJsonEditorValue] = useState("");
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
        : property.id.toLowerCase().includes(normalizedQuery);

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

  function restorePhotoPickerScrollState() {
    const scrollState = photoPickerScrollStateRef.current;

    if (!scrollState) {
      return;
    }

    if (catalogContentScrollRef.current) {
      catalogContentScrollRef.current.scrollTop = scrollState.panelScrollTop;
    }

    window.scrollTo({
      top: scrollState.windowScrollY,
      left: scrollState.windowScrollX,
      behavior: "auto",
    });
  }

  function openPhotoPicker() {
    photoPickerScrollStateRef.current = {
      panelScrollTop: catalogContentScrollRef.current?.scrollTop ?? 0,
      windowScrollX: window.scrollX,
      windowScrollY: window.scrollY,
    };

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    requestAnimationFrame(() => {
      restorePhotoPickerScrollState();
      photoFileInputRef.current?.click();
    });
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

  function applySelectedProperty(property: PropertyListing) {
    setSelectedId(property.id);
    setPropertyDraft(cloneProperty(property));
    setOriginalPropertyDraft(cloneProperty(property));
    setStatusMessage("");
    setGeocodeMessage("");
    setAiStatus("");
    setAiResult(null);
    setUploadedPhotos([]);
  }

  function applyCreatePropertyTemplate() {
    const template = createPropertyTemplate();
    setGeocodeMessage("");
    setSelectedId(null);
    setPropertyDraft(cloneProperty(template));
    setOriginalPropertyDraft(cloneProperty(template));
    setUploadedPhotos([]);
    setAiResult(null);
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
          city: propertyDraft.city.trim(),
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        latitude?: number;
        longitude?: number;
      };

      if (!response.ok || payload.latitude === undefined || payload.longitude === undefined) {
        setGeocodeMessage(payload.error ?? "Не удалось определить координаты по адресу.");
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
      setGeocodeMessage("Не удалось определить координаты по адресу.");
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

    const savedProperty =
      payload.properties.find((property) => property.id === nextProperty.id) ??
      nextProperty;

    setProperties(payload.properties);
    setSelectedId(savedProperty.id);
    setPropertyDraft(cloneProperty(savedProperty));
    setOriginalPropertyDraft(cloneProperty(savedProperty));
    return true;
  }

  async function saveSelectedProperty(): Promise<boolean> {
    if (!propertyDraft) {
      return false;
    }

    const nextId = propertyDraft.id.trim() || buildGeneratedPropertyId();
    const nextLatitude = Number(propertyDraft.location.latitude);
    const nextLongitude = Number(propertyDraft.location.longitude);
    const nextProperty: PropertyListing = {
      ...propertyDraft,
      id: nextId,
      slug: propertyDraft.slug.trim() || buildPropertySlug(propertyDraft.title, nextId),
      city: propertyDraft.city.trim() || "Лиссабон",
      district: propertyDraft.city.trim() || "Лиссабон",
      country: "Португалия",
      priceLabel: buildPriceLabel(propertyDraft.priceAmount, propertyDraft.mode),
      agentName: "Ирина",
      location: {
        ...propertyDraft.location,
        latitude: Number.isFinite(nextLatitude) ? nextLatitude : 38.7223,
        longitude: Number.isFinite(nextLongitude) ? nextLongitude : -9.1393,
        googleMapsUrl: buildGoogleMapsUrl(
          Number.isFinite(nextLatitude) ? nextLatitude : 38.7223,
          Number.isFinite(nextLongitude) ? nextLongitude : -9.1393
        ),
      },
      details: {
        ...propertyDraft.details,
        orientation: propertyDraft.details.orientation.filter(Boolean).length
          ? propertyDraft.details.orientation.filter(Boolean)
          : ["юг"],
      },
    };

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

        const createdProperty =
          payload.properties.find((property) => property.id === nextProperty.id) ?? nextProperty;
        setProperties(payload.properties);
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

    const nextSelected = payload.properties[0] ?? null;
    setProperties(payload.properties);
    setSelectedId(nextSelected?.id ?? null);
    setPropertyDraft(nextSelected ? cloneProperty(nextSelected) : null);
    setOriginalPropertyDraft(nextSelected ? cloneProperty(nextSelected) : null);
    setGeocodeMessage("");
    setUploadedPhotos([]);
    setAiResult(null);
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
    link.download = `${propertyDraft.id}.json`;
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
      const nextLatitude = Number(parsed.location.latitude);
      const nextLongitude = Number(parsed.location.longitude);
      const nextProperty: PropertyListing = {
        ...parsed,
        id: nextId,
        slug: parsed.slug.trim() || buildPropertySlug(parsed.title, nextId),
        city: parsed.city.trim() || "Лиссабон",
        district: parsed.city.trim() || "Лиссабон",
        country: "Португалия",
        priceLabel: buildPriceLabel(parsed.priceAmount, parsed.mode),
        agentName: "Ирина",
        location: {
          ...parsed.location,
          latitude: Number.isFinite(nextLatitude) ? nextLatitude : 38.7223,
          longitude: Number.isFinite(nextLongitude) ? nextLongitude : -9.1393,
          googleMapsUrl: buildGoogleMapsUrl(
            Number.isFinite(nextLatitude) ? nextLatitude : 38.7223,
            Number.isFinite(nextLongitude) ? nextLongitude : -9.1393
          ),
        },
        details: {
          ...parsed.details,
          orientation: parsed.details.orientation.filter(Boolean).length
            ? parsed.details.orientation.filter(Boolean)
            : ["юг"],
        },
      };

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

        const createdProperty =
          payload.properties.find((property) => property.id === nextProperty.id) ?? nextProperty;
        setProperties(payload.properties);
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
    restorePhotoPickerScrollState();
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    const formData = new FormData();

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
      setAiStatus("Фотографии загружены. Можно выбрать кадры для AI-обработки.");
      event.target.value = "";

      requestAnimationFrame(() => {
        restorePhotoPickerScrollState();
      });
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

        return {
          ...currentDraft,
          imageUrl: currentDraft.imageUrl || imageUrl,
          imageGallery: nextGallery,
        };
      }

      const nextGallery = currentDraft.imageGallery.filter((item) => item !== imageUrl);

      if (nextGallery.length === 0) {
        setStatusMessage("У объекта должна остаться хотя бы одна фотография.");
        return currentDraft;
      }

      return {
        ...currentDraft,
        imageUrl:
          currentDraft.imageUrl === imageUrl
            ? nextGallery[0] ?? currentDraft.imageUrl
            : currentDraft.imageUrl,
        imageGallery: nextGallery,
      };
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

  function removeImageFromGallery(imageUrl: string) {
    if (!propertyDraft) {
      return;
    }

    setPropertyDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      const nextGallery = currentDraft.imageGallery.filter((item) => item !== imageUrl);

      if (nextGallery.length === 0) {
        setStatusMessage("У объекта должна остаться хотя бы одна фотография.");
        return currentDraft;
      }

      return {
        ...currentDraft,
        imageUrl:
          currentDraft.imageUrl === imageUrl
            ? nextGallery[0] ?? currentDraft.imageUrl
            : currentDraft.imageUrl,
        imageGallery: nextGallery,
      };
    });

    setStatusMessage("Фотография убрана из галереи. Сохраните объект, чтобы закрепить изменение.");
  }

  async function generateAiVariants() {
    const selectedPhotos = uploadedPhotos.filter((photo) => photo.selectedForAi);

    if (selectedPhotos.length === 0) {
      setAiStatus("Нужно отметить хотя бы одно фото для AI-обработки.");
      return;
    }

    setIsGeneratingAi(true);
    setAiStatus("");

    try {
      const mockResult = buildMockAiResult(selectedPhotos, aiPalette);
      setAiResult(mockResult);
      setAiStatus("Подставлены временные мок-варианты. Можно отобрать лучшие и добавить в карточку.");
    } catch {
      setAiStatus("Ошибка генерации вариантов.");
    } finally {
      setIsGeneratingAi(false);
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
          <div className="flex flex-wrap gap-2">
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
                      placeholder="Например: irina-001"
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
                          {property.id}
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
                className="h-full min-h-0 overflow-y-auto pr-1"
              >
                <section className="grid gap-6 pb-6">
                <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-slate-950">Форма объекта</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
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
                              href={`/properties/${propertyDraft.slug}`}
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

                  {propertyDraft ? (
                    <div className="admin-form-shell grid gap-5">
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.7fr)_minmax(180px,0.78fr)_minmax(120px,0.56fr)_minmax(150px,0.72fr)_minmax(140px,0.62fr)]">
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            Заголовок
                          </span>
                          <input
                            value={propertyDraft.title}
                            onChange={(event) => setDraftValue("title", event.target.value)}
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
                            value={propertyDraft.priceAmount}
                            onChange={(event) =>
                              setDraftValue("priceAmount", toNumber(event.target.value))
                            }
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
                            value={propertyDraft.id}
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
                              className={withChangedFieldClass(
                                "h-11 w-full min-w-0 flex-1 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-emerald-500",
                                "location.addressLabel"
                              )}
                            />
                          </div>
                        </label>
                        <div className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-transparent">.</span>
                          <button
                            type="button"
                            onClick={fillCoordinatesFromAddress}
                            disabled={isGeocodingAddress}
                            title="Заполнить координаты по адресу"
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800 disabled:opacity-60"
                          >
                            {isGeocodingAddress ? "..." : "⌖"}
                          </button>
                        </div>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            Широта
                          </span>
                          <input
                            value={propertyDraft.location.latitude}
                            onChange={(event) =>
                              setDraftLocationValue("latitude", toNumber(event.target.value))
                            }
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
                            value={propertyDraft.location.longitude}
                            onChange={(event) =>
                              setDraftLocationValue("longitude", toNumber(event.target.value))
                            }
                            className={withChangedFieldClass(
                              "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                              "location.longitude"
                            )}
                          />
                        </label>
                        {!showsCompactLayout ? (
                          <div className="min-w-0">
                            {geocodeMessage ? (
                              <div className="pt-7 text-xs text-slate-500">{geocodeMessage}</div>
                            ) : null}
                          </div>
                        ) : null}
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
                                value={propertyDraft.details.yearBuilt}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "yearBuilt",
                                    toNumber(event.target.value)
                                  )
                                }
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
                                value={propertyDraft.details.buildingFloors ?? 0}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "buildingFloors",
                                    toNumber(event.target.value)
                                  )
                                }
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
                                ? "grid gap-4 md:grid-cols-2 2xl:grid-cols-[120px_88px_88px_96px_110px_110px_minmax(180px,0.9fr)]"
                                : "grid gap-4 md:grid-cols-2 2xl:grid-cols-[120px_88px_88px_96px_110px_minmax(180px,0.95fr)]"
                            }
                          >
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Ширина/площадь, м²
                              </span>
                              <input
                                value={propertyDraft.areaM2}
                                onChange={(event) =>
                                  setDraftValue("areaM2", toNumber(event.target.value))
                                }
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
                                value={propertyDraft.bedrooms}
                                onChange={(event) =>
                                  setDraftValue("bedrooms", toNumber(event.target.value))
                                }
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
                                value={propertyDraft.bathrooms}
                                onChange={(event) =>
                                  setDraftValue("bathrooms", toNumber(event.target.value))
                                }
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
                                value={propertyDraft.details.balconyCount}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "balconyCount",
                                    toNumber(event.target.value)
                                  )
                                }
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
                                value={propertyDraft.details.parkingSpaces}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "parkingSpaces",
                                    toNumber(event.target.value)
                                  )
                                }
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
                                value={propertyDraft.details.plotAreaM2 ?? 0}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "plotAreaM2",
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
                              className={`inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white text-slate-700 ${
                                showsCompactLayout
                                  ? "px-3 py-2 text-[13px]"
                                  : "px-4 py-3 text-sm"
                              }`}
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
                              key={`${route.route}-${index}`}
                              className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-2 lg:grid-cols-[0.82fr_0.96fr_1fr_0.92fr_auto]"
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
                                className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500"
                              >
                                {transportModeOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <input
                                value={route.route}
                                onChange={(event) =>
                                  setDraftTransportValue(index, "route", event.target.value)
                                }
                                placeholder="Маршрут"
                                className="h-10 rounded-2xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                              />
                              <input
                                value={route.stopName}
                                onChange={(event) =>
                                  setDraftTransportValue(index, "stopName", event.target.value)
                                }
                                placeholder="Остановка"
                                className="h-10 rounded-2xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
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
                                className="h-10 rounded-2xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
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

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-sm font-semibold text-slate-900">
                          Текущие фотографии объекта
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          {propertyDraft.imageGallery.length > 0 ? (
                            propertyDraft.imageGallery.map((imageUrl) => (
                              <div
                                key={imageUrl}
                                className={`overflow-hidden rounded-2xl border bg-white ${
                                  propertyDraft.imageUrl === imageUrl
                                    ? "border-amber-400 ring-2 ring-amber-200"
                                    : "border-slate-200"
                                }`}
                              >
                                <img
                                  src={imageUrl}
                                  alt={propertyDraft.title}
                                  className="h-32 w-full object-cover"
                                />
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
                                    <button
                                      type="button"
                                      onClick={() => removeImageFromGallery(imageUrl)}
                                      className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50"
                                    >
                                      Удалить
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                              У объекта пока нет фотографий.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      Выберите объект слева или создайте новый.
                    </div>
                  )}
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4">
                    <div className="text-sm font-semibold text-slate-950">
                      Фотографии и AI-варианты
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      Загружайте фото, отмечайте нужные кадры для очистки и генерации,
                      затем переносите лучшие варианты в фотографии объекта.
                    </div>
                  </div>

                  <div className="grid items-start gap-5 lg:grid-cols-[1fr_1fr]">
                    <div className="grid self-start gap-4">
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold text-slate-800">
                          Загрузка фотографий
                        </span>
                        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
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
                              className="hidden"
                            />
                          </div>
                        </div>
                      </label>

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
                          ? "Генерируем варианты..."
                          : "Очистить фото и сгенерировать варианты"}
                      </button>

                      {aiStatus ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                          {aiStatus}
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
                                  <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                                    <input
                                      type="checkbox"
                                      checked={photo.selectedForAi}
                                      onChange={() => togglePhotoForAi(photo.id)}
                                      className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                                    />
                                    Использовать для AI
                                  </label>
                                  <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                                    <input
                                      type="checkbox"
                                      checked={propertyDraft?.imageGallery.includes(photo.previewUrl) ?? false}
                                      onChange={(event) =>
                                        togglePhotoInGallery(photo.previewUrl, event.target.checked)
                                      }
                                      className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                                    />
                                    В галерею объекта
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid self-start gap-3">
                      {aiResult ? (
                        aiResult.variants.map((variant) => (
                          <article
                            key={variant.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <img
                              src={variant.photoImageUrl}
                              alt={variant.title}
                              className="h-44 w-full rounded-2xl object-cover"
                            />
                            <div className="mt-3 flex items-start justify-between gap-3">
                              <div>
                                <div className="text-base font-semibold text-slate-950">
                                  {variant.title}
                                </div>
                                <div className="mt-1 text-sm text-slate-600">
                                  {variant.description}
                                </div>
                              </div>
                              <div className="flex shrink-0 flex-col gap-2">
                                <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                                  <input
                                    type="checkbox"
                                    checked={propertyDraft?.imageGallery.includes(variant.photoImageUrl) ?? false}
                                    onChange={(event) =>
                                      togglePhotoInGallery(
                                        variant.photoImageUrl,
                                        event.target.checked
                                      )
                                    }
                                    className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                                  />
                                  В галерею объекта
                                </label>
                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadImageToComputer(
                                      variant.photoImageUrl,
                                      `${variant.id}.jpg`
                                    )
                                  }
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                                >
                                  Сохранить
                                </button>
                              </div>
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                          Здесь появятся AI-варианты после генерации.
                        </div>
                      )}
                    </div>
                  </div>
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
                          Типы объектов
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
                            <div className="text-base font-semibold text-slate-950">
                              {property.title}
                            </div>
                            <div className="mt-1 text-sm text-slate-500">
                              {property.city} · {property.priceLabel}
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
                            <div className="text-base font-semibold text-slate-950">
                              {property.title}
                            </div>
                            <div className="mt-1 text-sm text-slate-500">
                              {property.city} · {property.priceLabel}
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
                    Редактируется только текущий объект: {propertyDraft.id}
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
