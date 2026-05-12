"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeCityName } from "@/lib/real-estate/city";
import {
  featureTranslations,
  formatPropertyPrice,
  propertyTypeTranslations,
  siteTranslations,
  type SiteFeatureKey,
  type SiteLocale,
} from "@/lib/i18n/site";
import { useSiteLocale } from "@/lib/i18n/use-site-locale";
import {
  getPropertyCoverImage,
  getPropertyImagePosition,
} from "@/lib/real-estate/property-cover";
import type {
  ListingMode,
  PropertyListing,
  PropertyType,
} from "@/lib/real-estate/types";
import { useCompareList } from "@/lib/real-estate/useCompareList";
import { useFavoritesList } from "@/lib/real-estate/useFavoritesList";
import { AgencyLogo } from "./AgencyLogo";
import { LanguageSwitcher } from "./LanguageSwitcher";

function getPropertyPublicPath(property: PropertyListing) {
  const generatedIdSlug = property.id.replace(/^irina-/, "");
  const pathSlug = /^irina-\d+$/.test(property.id) ? generatedIdSlug : property.slug;

  return `/properties/${encodeURIComponent(pathSlug)}`;
}

function getPropertyDisplayId(property: Pick<PropertyListing, "id">) {
  return property.id.replace(/^irina-/, "");
}

function isAiGeneratedImage(property: PropertyListing, imageUrl: string) {
  return property.imageSources?.[imageUrl] === "ai_generated";
}

function getLocalizedPropertyContent(property: PropertyListing, locale: SiteLocale) {
  const translation = property.translations?.[locale];
  const isFallback = locale !== (property.sourceLocale ?? "ru") && !translation;

  return {
    title: translation?.title || property.title,
    city: translation?.city || property.city,
    shortDescription: translation?.shortDescription || property.shortDescription,
    isFallback,
  };
}

type CatalogFeatureFilterKey = SiteFeatureKey;

const catalogFeatureOptions: Array<{
  value: CatalogFeatureFilterKey;
}> = [
  { value: "sea_view" },
  { value: "city_center" },
  { value: "parking" },
  { value: "pool" },
  { value: "security" },
  { value: "furnished" },
  { value: "balcony" },
  { value: "terrace" },
  { value: "storageRoom" },
  { value: "elevator" },
  { value: "equippedKitchen" },
  { value: "builtInWardrobes" },
];

const propertyTypeOptions: Array<{ value: PropertyType; label: string }> = [
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

function getPropertyTags(property: PropertyListing, locale: SiteLocale): string[] {
  const featureLabels = featureTranslations[locale];
  const tags = new Set<string>(
    property.features.map((feature) => featureLabels[feature])
  );

  if (property.details.storageRoom) tags.add(featureLabels.storageRoom);
  if (property.details.elevator) tags.add(featureLabels.elevator);
  if (property.details.equippedKitchen) tags.add(featureLabels.equippedKitchen);
  if (property.details.builtInWardrobes) tags.add(featureLabels.builtInWardrobes);
  if (property.details.parkingSpaces > 0) tags.add(featureLabels.parking);
  if (property.details.balconyCount > 0) tags.add(featureLabels.balcony);
  if (property.details.terraceCount > 0) tags.add(featureLabels.terrace);

  return Array.from(tags);
}

function getCatalogMetrics(
  property: PropertyListing,
  locale: SiteLocale
) {
  const typeLabel = propertyTypeTranslations[locale][property.details.propertyType];
  const t = siteTranslations[locale];

  if (property.details.propertyType === "land") {
    return [
      { label: t.area, value: `${property.areaM2} м²` },
      { label: t.propertyType, value: typeLabel },
      { label: t.condition, value: typeLabel },
    ];
  }

  return [
    { label: t.area, value: `${property.areaM2} м²` },
    { label: t.bedrooms, value: String(property.bedrooms) },
    { label: t.propertyType, value: typeLabel },
  ];
}

type LocationFilter = "all" | "drawn_area";
type FavoriteFilter = "all" | "favorite";
type MapPoint = { lat: number; lng: number };
type SearchPreferencesPayload = {
  mode: ListingMode;
  city?: string;
  propertyType?: PropertyType;
  priceFrom?: number;
  priceTo?: number;
  bedrooms?: string;
  features?: CatalogFeatureFilterKey[];
};

function hasMeaningfulSearchProfile(searchProfile: SearchPreferencesPayload) {
  return Boolean(
    searchProfile.mode === "rent" ||
      searchProfile.city ||
      searchProfile.propertyType ||
      typeof searchProfile.priceFrom === "number" ||
      typeof searchProfile.priceTo === "number" ||
      searchProfile.bedrooms ||
      (searchProfile.features && searchProfile.features.length > 0)
  );
}

function matchesCatalogFeature(
  property: PropertyListing,
  feature: CatalogFeatureFilterKey
) {
  if (feature === "storageRoom") {
    return property.details.storageRoom;
  }

  if (feature === "elevator") {
    return property.details.elevator;
  }

  if (feature === "equippedKitchen") {
    return property.details.equippedKitchen;
  }

  if (feature === "builtInWardrobes") {
    return property.details.builtInWardrobes;
  }

  return property.features.includes(feature);
}

const PropertyMap = dynamic(
  () => import("@/components/PropertyMap").then((module) => module.PropertyMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-[#ddebf7]" />,
  }
);

const LISTINGS_PER_PAGE = 2;

function isPointInsidePolygon(point: MapPoint, polygon: MapPoint[]): boolean {
  if (polygon.length < 3) {
    return false;
  }

  let isInside = false;

  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index++
  ) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];

    const intersects =
      currentPoint.lat > point.lat !== previousPoint.lat > point.lat &&
      point.lng <
        ((previousPoint.lng - currentPoint.lng) * (point.lat - currentPoint.lat)) /
          (previousPoint.lat - currentPoint.lat) +
          currentPoint.lng;

    if (intersects) {
      isInside = !isInside;
    }
  }

  return isInside;
}

function mapPropertyToPoint(property: PropertyListing): MapPoint {
  return {
    lat: property.location.latitude,
    lng: property.location.longitude,
  };
}

function parsePriceFilterValue(value: string): number | undefined {
  const normalizedValue = value.replace(/\s/g, "").replace(",", ".");

  if (normalizedValue.length === 0) {
    return undefined;
  }

  const amount = Number(normalizedValue);

  if (!Number.isFinite(amount)) {
    return undefined;
  }

  return Math.max(0, Math.round(amount));
}

function getPriceRangeFromInputs(priceFromInput: string, priceToInput: string) {
  const priceFrom = parsePriceFilterValue(priceFromInput);
  const priceTo = parsePriceFilterValue(priceToInput);

  if (typeof priceFrom === "number" && typeof priceTo === "number" && priceFrom > priceTo) {
    return { priceFrom: priceTo, priceTo: priceFrom };
  }

  return {
    priceFrom,
    priceTo,
  };
}

type RealEstateCatalogProps = {
  propertiesData: PropertyListing[];
};

type CatalogAuthUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: "admin" | "realtor" | "client";
};

export function RealEstateCatalog({ propertiesData }: RealEstateCatalogProps) {
  const [mode, setMode] = useState<ListingMode>("sale");
  const [language, setSiteLanguage] = useSiteLocale();
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [bedroomFilter, setBedroomFilter] = useState<string>("all");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<"all" | PropertyType>("all");
  const [selectedFeatures, setSelectedFeatures] = useState<CatalogFeatureFilterKey[]>([]);
  const [priceFromInput, setPriceFromInput] = useState("");
  const [priceToInput, setPriceToInput] = useState("");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("all");
  const [favoriteFilter, setFavoriteFilter] = useState<FavoriteFilter>("all");
  const [selectedMapPropertyId, setSelectedMapPropertyId] = useState<string | null>(
    null
  );
  const [isDrawingArea, setIsDrawingArea] = useState(false);
  const [draftPolygon, setDraftPolygon] = useState<MapPoint[]>([]);
  const [appliedPolygon, setAppliedPolygon] = useState<MapPoint[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [imageIndexes, setImageIndexes] = useState<Record<string, number>>({});
  const [currentUser, setCurrentUser] = useState<CatalogAuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const lastSavedSearchSignatureRef = useRef("");
  const { compareIds, toggleCompare } = useCompareList();
  const { favoriteIds, toggleFavorite } = useFavoritesList();
  const t = siteTranslations[language];
  const localizedPropertyTypeLabels = propertyTypeTranslations[language];

  useEffect(() => {
    let isCancelled = false;

    async function loadCurrentUser() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (!isCancelled) {
            setCurrentUser(null);
          }
          return;
        }

        const payload = (await response.json()) as { user?: CatalogAuthUser | null };

        if (!isCancelled) {
          setCurrentUser(payload.user ?? null);
        }
      } catch {
        if (!isCancelled) {
          setCurrentUser(null);
        }
      } finally {
        if (!isCancelled) {
          setIsAuthLoading(false);
        }
      }
    }

    void loadCurrentUser();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!currentUser || isAuthLoading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const priceRange = getPriceRangeFromInputs(priceFromInput, priceToInput);
      const searchProfile: SearchPreferencesPayload = {
        mode,
        city: cityFilter !== "all" ? cityFilter : undefined,
        propertyType: propertyTypeFilter !== "all" ? propertyTypeFilter : undefined,
        bedrooms: bedroomFilter !== "all" ? bedroomFilter : undefined,
        features: selectedFeatures.length > 0 ? selectedFeatures : undefined,
        ...priceRange,
      };
      const searchSignature = JSON.stringify(searchProfile);

      if (
        !hasMeaningfulSearchProfile(searchProfile) ||
        lastSavedSearchSignatureRef.current === searchSignature
      ) {
        return;
      }

      lastSavedSearchSignatureRef.current = searchSignature;

      void fetch("/api/user/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ searchProfile }),
      });
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [
    bedroomFilter,
    cityFilter,
    currentUser,
    isAuthLoading,
    mode,
    priceFromInput,
    priceToInput,
    propertyTypeFilter,
    selectedFeatures,
  ]);

  const cities = useMemo(() => {
    const uniqueCities = new Set(
      propertiesData
        .filter((property) => property.mode === mode)
        .map((property) => normalizeCityName(property.city))
    );

    return Array.from(uniqueCities).sort((left, right) => left.localeCompare(right));
  }, [mode, propertiesData]);

  useEffect(() => {
    if (cityFilter !== "all" && !cities.includes(cityFilter)) {
      const timeoutId = window.setTimeout(() => {
        setCityFilter("all");
        setCurrentPage(1);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [cities, cityFilter]);

  const properties = useMemo(() => {
    const { priceFrom, priceTo } = getPriceRangeFromInputs(priceFromInput, priceToInput);

    return propertiesData.filter((property) => {
      if (property.mode !== mode) {
        return false;
      }

      if (cityFilter !== "all" && normalizeCityName(property.city) !== cityFilter) {
        return false;
      }

      if (propertyTypeFilter !== "all" && property.details.propertyType !== propertyTypeFilter) {
        return false;
      }

      if (bedroomFilter === "room") {
        return property.details.propertyType === "room";
      }

      if (bedroomFilter !== "all") {
        const minimumBedrooms = Number(bedroomFilter);

        if (Number.isFinite(minimumBedrooms) && property.bedrooms < minimumBedrooms) {
          return false;
        }
      }

      if (
        selectedFeatures.length > 0 &&
        !selectedFeatures.every((feature) => matchesCatalogFeature(property, feature))
      ) {
        return false;
      }

      if (favoriteFilter === "favorite" && !favoriteIds.includes(property.id)) {
        return false;
      }

      if (typeof priceFrom === "number" && property.priceAmount < priceFrom) {
        return false;
      }

      if (typeof priceTo === "number" && property.priceAmount > priceTo) {
        return false;
      }

      if (locationFilter === "drawn_area") {
        return isPointInsidePolygon(mapPropertyToPoint(property), appliedPolygon);
      }

      return true;
    });
  }, [
    appliedPolygon,
    bedroomFilter,
    cityFilter,
    favoriteFilter,
    favoriteIds,
    locationFilter,
    mode,
    priceFromInput,
    priceToInput,
    propertyTypeFilter,
    propertiesData,
    selectedFeatures,
  ]);

  const pageCount = Math.max(1, Math.ceil(properties.length / LISTINGS_PER_PAGE));
  const currentListPage = Math.min(currentPage, pageCount);
  const pagedProperties = useMemo(() => {
    const startIndex = (currentListPage - 1) * LISTINGS_PER_PAGE;
    return properties.slice(startIndex, startIndex + LISTINGS_PER_PAGE);
  }, [currentListPage, properties]);
  const selectedMapProperty =
    properties.find((property) => property.id === selectedMapPropertyId) ??
    properties[0] ??
    null;

  function resetFilters() {
    setCityFilter("all");
    setBedroomFilter("all");
    setPropertyTypeFilter("all");
    setSelectedFeatures([]);
    setPriceFromInput("");
    setPriceToInput("");
    setLocationFilter("all");
    setFavoriteFilter("all");
  }

  function toggleFeatureFilter(feature: CatalogFeatureFilterKey) {
    setSelectedFeatures((currentFeatures) =>
      currentFeatures.includes(feature)
        ? currentFeatures.filter((currentFeature) => currentFeature !== feature)
        : [...currentFeatures, feature]
    );
    setCurrentPage(1);
  }

  function clearPolygonSelection() {
    setDraftPolygon([]);
    setAppliedPolygon([]);
    setIsDrawingArea(false);

    if (locationFilter === "drawn_area") {
      setLocationFilter("all");
    }
  }

  function applyPolygonSelection() {
    if (draftPolygon.length < 3) {
      return;
    }

    setAppliedPolygon(draftPolygon);
    setLocationFilter("drawn_area");
    setIsDrawingArea(false);
  }

  function handleMapCanvasClick(
    nextPoint: MapPoint
  ) {
    setDraftPolygon((currentPoints) => [...currentPoints, nextPoint]);
  }

  function changeImage(propertyId: string, direction: -1 | 1, imageCount: number) {
    setImageIndexes((currentIndexes) => {
      const currentIndex = currentIndexes[propertyId] ?? 0;
      const nextIndex = (currentIndex + direction + imageCount) % imageCount;

      return {
        ...currentIndexes,
        [propertyId]: nextIndex,
      };
    });
  }

  function getCurrentImage(property: PropertyListing): string {
    const currentIndex = imageIndexes[property.id] ?? 0;
    return property.imageGallery[currentIndex] ?? getPropertyCoverImage(property);
  }

  async function handleCatalogLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setCurrentUser(null);
      window.location.reload();
    }
  }

  return (
    <main className="site-page-background flex min-h-screen flex-col text-slate-950">
      <header className="relative border-b border-slate-200 bg-white">
        {currentUser ? (
          <div className="absolute right-3 top-1 max-w-[180px] truncate text-[11px] font-semibold leading-none text-slate-500 sm:right-6 lg:hidden">
            {currentUser.email}
          </div>
        ) : null}
        <div className="mx-auto flex max-w-[1380px] flex-col items-center gap-3 px-3 pb-4 pt-5 sm:px-6 lg:flex-row lg:justify-between lg:gap-4 lg:px-8 lg:py-5">
          <Link href="/" className="order-1 -my-1 flex items-center overflow-visible sm:-my-3 lg:order-none lg:-my-5">
            <AgencyLogo priority className="h-[56px] w-auto object-contain sm:h-[76px] lg:h-[88px]" />
            <div className="hidden flex h-12 w-12 items-center justify-center rounded-[18px] bg-emerald-900 text-sm font-semibold text-white shadow-sm">
              И
            </div>
            <div className="hidden">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
                Агентство недвижимости
              </div>
              <div className="text-[2rem] font-semibold leading-none tracking-tight text-slate-950">
                ИРИНА
              </div>
            </div>
          </Link>

          <div className="order-2 flex w-full justify-center lg:order-none lg:w-auto">
            <LanguageSwitcher language={language} onChange={setSiteLanguage} />
          </div>

          <div className="order-4 flex w-full justify-center lg:order-none lg:w-auto">
            <div className="inline-flex rounded-[20px] border border-slate-200 bg-white p-1.5 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setMode("sale");
                  setCurrentPage(1);
                }}
                className={`rounded-2xl px-5 py-2.5 text-sm font-semibold transition sm:px-9 sm:py-3 sm:text-[1.05rem] ${
                  mode === "sale"
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
                aria-pressed={mode === "sale"}
              >
                {t.sale}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("rent");
                  setCurrentPage(1);
                }}
                className={`rounded-2xl px-5 py-2.5 text-sm font-semibold transition sm:px-9 sm:py-3 sm:text-[1.05rem] ${
                  mode === "rent"
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
                aria-pressed={mode === "rent"}
              >
                {t.rent}
              </button>
            </div>
          </div>

          <div className="order-3 flex w-full flex-wrap items-center justify-center gap-2 sm:gap-3 lg:order-none lg:w-auto lg:justify-end">
            <Link
              href="/compare"
              className="inline-flex h-9 items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800 sm:h-11 sm:px-4 sm:text-sm"
            >
              <span>{t.compare}</span>
              <span className="rounded-full bg-slate-950 px-2 py-1 text-xs text-white">
                {compareIds.length}
              </span>
            </Link>

            {currentUser ? (
              <>
                {currentUser.role === "admin" ? (
                  <Link
                    href="/admin"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center rounded-[18px] border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-900 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100 sm:h-11 sm:px-4 sm:text-sm"
                  >
                    {t.admin}
                  </Link>
                ) : null}
                <div className="relative">
                  <div className="absolute -top-4 left-1 hidden max-w-[130px] truncate text-[11px] font-semibold leading-none text-slate-500 lg:block">
                    {currentUser.email}
                  </div>
              <button
                type="button"
                onClick={() => {
                  void handleCatalogLogout();
                }}
                    className="inline-flex h-9 items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800 sm:h-11 sm:px-4 sm:text-sm"
              >
                <span className="text-base">←</span>
                    <span>{t.logout}</span>
              </button>
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-9 items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800 sm:h-11 sm:px-4 sm:text-sm"
              >
                <span className="text-base">⌂</span>
                <span>{isAuthLoading ? "..." : t.login}</span>
              </Link>
            )}

          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1380px] px-4 py-4 sm:px-8 sm:py-5">
        <div className="flex flex-col items-center gap-3">
            <div className="hidden w-full justify-end">
              <Link
                href="/contact-realtor"
                className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800"
              >
                {t.contactRealtor}
              </Link>
            </div>

            <div className="grid w-full gap-2 rounded-[24px] border border-slate-200 bg-[#fbfdff] p-3 shadow-sm lg:grid-cols-[1fr_minmax(19rem,1.65fr)_0.75fr_1fr_0.72fr_0.72fr_auto]">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {t.city}
                </span>
                <select
                  value={cityFilter}
                  onChange={(event) => {
                    setCityFilter(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="all">{t.allCities}</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {t.price}
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    placeholder={t.from}
                    value={priceFromInput}
                    onChange={(event) => {
                      setPriceFromInput(event.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    placeholder={t.to}
                    value={priceToInput}
                    onChange={(event) => {
                      setPriceToInput(event.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {t.bedrooms}
                </span>
                <select
                  value={bedroomFilter}
                  onChange={(event) => {
                    setBedroomFilter(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="all">{t.anyNumber}</option>
                  {mode === "rent" ? <option value="room">{t.room}</option> : null}
                  <option value="1">{t.fromBedrooms.replace("{count}", "1")}</option>
                  <option value="2">{t.fromBedrooms.replace("{count}", "2")}</option>
                  <option value="3">{t.fromBedrooms.replace("{count}", "3")}</option>
                  <option value="4">{t.fromBedrooms.replace("{count}", "4")}</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {t.propertyType}
                </span>
                <select
                  value={propertyTypeFilter}
                  onChange={(event) => {
                    setPropertyTypeFilter(event.target.value as "all" | PropertyType);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="all">{t.anyType}</option>
                  {propertyTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {localizedPropertyTypeLabels[option.value]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {t.location}
                </span>
                <select
                  value={locationFilter}
                  onChange={(event) => {
                    setLocationFilter(event.target.value as LocationFilter);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="all">{t.wholeMap}</option>
                  <option value="drawn_area">{t.drawnArea}</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {t.favorites}
                </span>
                <select
                  value={favoriteFilter}
                  onChange={(event) => {
                    setFavoriteFilter(event.target.value as FavoriteFilter);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="all">{t.allProperties}</option>
                  <option value="favorite">{t.onlyFavorites}</option>
                </select>
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                >
                  {t.reset}
                </button>
              </div>
            </div>

            <div className="grid w-full gap-3 rounded-[24px] border border-slate-200 bg-[#fbfdff] p-3 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {t.features}
              </div>
              <div className="flex flex-wrap gap-2">
                {catalogFeatureOptions.map((option) => {
                  const isActive = selectedFeatures.includes(option.value);

                  return (
                    <label
                      key={option.value}
                      className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition ${
                        isActive
                          ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => toggleFeatureFilter(option.value)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                      />
                      <span>{featureTranslations[language][option.value]}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <div>
                  {t.found}:{" "}
                  <span className="font-semibold text-slate-800">{properties.length}</span>
                </div>
                <div>
                  {t.inCompare}:{" "}
                  <span className="font-semibold text-slate-800">
                    {compareIds.length}
                  </span>
                </div>
                <div>
                  {t.inFavorites}:{" "}
                  <span className="font-semibold text-slate-800">
                    {favoriteIds.length}
                  </span>
                </div>
              </div>

              <div className="flex justify-center">
                <Link
                  href="/contact-realtor"
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800"
                >
                  {t.contactRealtor}
                </Link>
              </div>

              <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm md:justify-self-end">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    viewMode === "list"
                      ? "bg-slate-950 text-white"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                  aria-pressed={viewMode === "list"}
                >
                  {t.list}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("map")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    viewMode === "map"
                      ? "bg-slate-950 text-white"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                  aria-pressed={viewMode === "map"}
                >
                  {t.map}
                </button>
              </div>
            </div>

        </div>
      </div>

      <section id="catalog" className="mx-auto flex-1 max-w-[1380px] px-4 pb-16 pt-6 sm:px-8 sm:pt-8">
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  {t.catalog}
                </div>

                {viewMode === "list" && (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-sm text-slate-500">
                      {t.page} {currentListPage} {t.of} {pageCount}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        disabled={currentListPage === 1}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {t.previous}
                      </button>

                      {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                            currentListPage === page
                              ? "bg-slate-950 text-white"
                              : "border border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage((page) => Math.min(pageCount, page + 1))
                        }
                        disabled={currentListPage === pageCount}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {t.next}
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {viewMode === "list" ? (
            <>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {pagedProperties.map((property) => {
                  const currentImage = getCurrentImage(property);
                  const imageCount = property.imageGallery.length;
                  const currentImageIndex = imageIndexes[property.id] ?? 0;
                  const isCompared = compareIds.includes(property.id);
                  const isFavorite = favoriteIds.includes(property.id);
                  const propertyTags = getPropertyTags(property, language);
                  const propertyMetrics = getCatalogMetrics(property, language);
                  const localizedProperty = getLocalizedPropertyContent(property, language);
                  const localizedPrice = formatPropertyPrice(
                    property.priceAmount,
                    property.mode,
                    language
                  );

                  return (
                    <article
                      key={property.id}
                      className="group overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]"
                    >
                      <div className="relative">
                        {isAiGeneratedImage(property, currentImage) ? (
                          <div className="absolute bottom-4 left-4 z-10 rounded-full bg-slate-950/80 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                            AI
                          </div>
                        ) : null}
                        <img
                          src={currentImage}
                          alt={localizedProperty.title}
                          className="h-60 w-full object-cover md:h-64"
                          style={{ objectPosition: getPropertyImagePosition(property, currentImage) }}
                        />

                        <div className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 shadow-sm">
                          {property.mode === "sale" ? t.sale : t.rent}
                        </div>
                        {localizedProperty.isFallback ? (
                          <div className="absolute right-4 top-4 rounded-full border border-slate-200 bg-white/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 shadow-sm">
                            default
                          </div>
                        ) : null}

                        {imageCount > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={() => changeImage(property.id, -1, imageCount)}
                              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/92 text-lg font-semibold text-slate-900 shadow-sm transition hover:bg-white"
                              aria-label="Предыдущее фото"
                            >
                              ‹
                            </button>
                            <button
                              type="button"
                              onClick={() => changeImage(property.id, 1, imageCount)}
                              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/92 text-lg font-semibold text-slate-900 shadow-sm transition hover:bg-white"
                              aria-label="Следующее фото"
                            >
                              ›
                            </button>
                            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                              {property.imageGallery.map((_, index) => (
                                <span
                                  key={`${property.id}-dot-${index}`}
                                  className={`h-2.5 w-2.5 rounded-full ${
                                    currentImageIndex === index
                                      ? "bg-white"
                                      : "bg-white/50"
                                  }`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="grid gap-3 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h3 className="text-[1.25rem] font-semibold leading-tight tracking-tight text-slate-950">
                              {localizedProperty.title}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                              {localizedProperty.city}, {property.district}, {property.country}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-[#eef6f4] px-4 py-2 text-sm font-semibold leading-tight text-emerald-900">
                            {localizedPrice}
                          </div>
                        </div>

                        <p className="text-sm leading-5 text-slate-600">
                          {localizedProperty.shortDescription}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {propertyTags.slice(0, 4).map((featureLabel) => (
                            <span
                              key={`${property.id}-${featureLabel}`}
                              className="rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600"
                            >
                              {featureLabel}
                            </span>
                          ))}
                        </div>

                        <div className="grid gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600 sm:grid-cols-3">
                          {propertyMetrics.map((metric) => (
                            <div key={`${property.id}-${metric.label}`}>
                              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                {metric.label}
                              </div>
                              <div className="mt-1 font-semibold text-slate-900">
                                {metric.value}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                          <div className="text-xs text-slate-500">
                            {t.propertyId}:{" "}
                            <span className="font-semibold text-slate-700">
                              {getPropertyDisplayId(property)}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => toggleFavorite(property.id)}
                              className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                                isFavorite
                                  ? "border border-amber-300 bg-amber-50 text-amber-900"
                                  : "border border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:text-amber-800"
                              }`}
                            >
                              {isFavorite ? t.inFavorite : t.addFavorite}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleCompare(property.id)}
                              className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                                isCompared
                                  ? "border border-emerald-300 bg-emerald-50 text-emerald-900"
                                  : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-800"
                              }`}
                            >
                              {isCompared
                                ? t.compared
                                : t.addCompare}
                            </button>
                            <a
                              href={property.location.googleMapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                            >
                              {t.map}
                            </a>
                            <Link
                              href={getPropertyPublicPath(property)}
                              className="rounded-xl bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                              {t.openCard}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

            </>
          ) : (
            <div className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
              <div className="flex max-h-[820px] flex-col items-start gap-4 overflow-y-auto pr-1">
                {properties.map((property) => {
                  const isActive = selectedMapProperty?.id === property.id;
                  const isFavorite = favoriteIds.includes(property.id);
                  const compactMetrics = getCatalogMetrics(property, language);
                  const localizedProperty = getLocalizedPropertyContent(property, language);
                  const localizedPrice = formatPropertyPrice(
                    property.priceAmount,
                    property.mode,
                    language
                  );

                  return (
                    <article
                      key={property.id}
                      onClick={() => setSelectedMapPropertyId(property.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedMapPropertyId(property.id);
                        }
                      }}
                      className={`w-full max-w-[360px] cursor-pointer self-start rounded-[24px] border p-3 text-left transition ${
                        isActive
                          ? "border-emerald-400 bg-emerald-50/60 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[18px]">
                          {isAiGeneratedImage(property, getPropertyCoverImage(property)) ? (
                            <span className="absolute bottom-1 left-1 z-10 rounded-full bg-slate-950/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white">
                              AI
                            </span>
                          ) : null}
                          <img
                            src={getPropertyCoverImage(property)}
                            alt={localizedProperty.title}
                            className="h-full w-full object-cover"
                            style={{
                              objectPosition: getPropertyImagePosition(
                                property,
                                getPropertyCoverImage(property)
                              ),
                            }}
                          />
                          {localizedProperty.isFallback ? (
                            <span className="absolute right-1 top-1 rounded-full border border-slate-200 bg-white/92 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                              default
                            </span>
                          ) : null}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="line-clamp-2 text-base font-semibold leading-tight text-slate-950">
                                {localizedProperty.title}
                              </div>
                              <div className="mt-1 line-clamp-1 text-sm text-slate-500">
                                {property.location.addressLabel}
                              </div>
                            </div>
                            <div className="shrink-0 rounded-2xl bg-white px-3 py-2 text-sm font-semibold leading-tight text-emerald-900 shadow-sm">
                              {localizedPrice}
                            </div>
                          </div>

                          <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">
                            {localizedProperty.shortDescription}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span>{compactMetrics[0]?.value}</span>
                            <span>•</span>
                            <span>{compactMetrics[1]?.value}</span>
                            <span>•</span>
                            <span>{compactMetrics[2]?.value}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleFavorite(property.id);
                          }}
                          className={`rounded-2xl px-3 py-2 text-center text-xs font-semibold transition ${
                            isFavorite
                              ? "border border-amber-300 bg-amber-50 text-amber-900"
                              : "border border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:text-amber-800"
                          }`}
                        >
                          {isFavorite ? t.favorites : t.addFavorite}
                        </button>
                        <a
                          href={property.location.googleMapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                        >
                          {t.map}
                        </a>
                        <Link
                          href={getPropertyPublicPath(property)}
                          onClick={(event) => event.stopPropagation()}
                          className="rounded-2xl bg-slate-950 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-slate-800"
                        >
                          {t.openCard}
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
                  <div>
                    <div className="text-lg font-semibold text-slate-950">
                      {t.mapTitle}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {t.mapHelp}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode("map");
                        setIsDrawingArea(true);
                        setDraftPolygon([]);
                      }}
                      className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        isDrawingArea
                          ? "bg-emerald-900 text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-800"
                      }`}
                    >
                      {isDrawingArea ? t.drawing : t.drawArea}
                    </button>

                    <button
                      type="button"
                      onClick={applyPolygonSelection}
                      disabled={draftPolygon.length < 3}
                      className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {t.applyArea}
                    </button>

                    <button
                      type="button"
                      onClick={clearPolygonSelection}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                    >
                      {t.clear}
                    </button>
                  </div>
                </div>

                <div className="relative h-[720px] overflow-hidden bg-[#ddebf7]">
                  <a
                    href={
                      selectedMapProperty?.location.googleMapsUrl ??
                      "https://www.google.com/maps/search/?api=1&query=Portugal"
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="absolute right-6 top-5 z-20 max-w-[calc(100%-3rem)] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800"
                  >
                    {t.openGoogleMaps}
                  </a>

                  <div className="absolute inset-0">
                    <PropertyMap
                      properties={properties}
                      selectedPropertyId={selectedMapProperty?.id ?? null}
                      onSelectProperty={setSelectedMapPropertyId}
                      isDrawingArea={isDrawingArea}
                      draftPolygon={draftPolygon}
                      appliedPolygon={appliedPolygon}
                      onAddPolygonPoint={handleMapCanvasClick}
                    />
                  </div>

                  {isDrawingArea && (
                    <div className="pointer-events-none absolute bottom-4 left-4 z-[500] rounded-xl bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
                      {t.mapClickHelp}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
                  <div>
                    {appliedPolygon.length >= 3
                      ? t.areaFilterActive
                      : t.areaFilterHelp}
                  </div>
                  <div className="font-semibold text-slate-900">
                    {t.areaPoints}: {(draftPolygon.length > 0 ? draftPolygon : appliedPolygon).length}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-[#0f172a] text-slate-200">
        <div className="mx-auto grid max-w-7xl gap-3 px-5 py-8 md:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-3">
            <div className="text-lg font-semibold">{t.agencyName}</div>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">
              {t.contacts}: +351 912 345 678 | info@irina-realestate.com
            </p>
          </div>

          <div className="grid gap-3">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              {t.legalInfo}
            </div>
            <ul className="grid gap-2 text-sm leading-5 text-slate-300">
              <li>
                <Link href="/privacy" className="transition hover:text-white">
                  {t.privacyPolicy}
                </Link>
              </li>
              <li>
                <Link href="/ai-disclosure" className="transition hover:text-white">
                  {t.aiDisclosure}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </main>
  );
}
