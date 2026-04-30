"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { getFeatureLabel } from "@/lib/real-estate/data";
import type { ListingFeature, ListingMode, PropertyListing } from "@/lib/real-estate/types";
import { useCompareList } from "@/lib/real-estate/useCompareList";

const languageOptions = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
  { code: "uk", label: "UA" },
] as const;

const featureFilterOptions: Array<{
  value: "all" | ListingFeature;
  label: string;
}> = [
  { value: "all", label: "Любая характеристика" },
  { value: "parking", label: "Паркинг" },
  { value: "furnished", label: "С мебелью" },
  { value: "sea_view", label: "Вид на море" },
  { value: "terrace", label: "Терраса" },
] as const;

const salePriceOptions = [
  { value: "all", label: "Любая цена" },
  { value: "under_700k", label: "До €700k" },
  { value: "700k_1_5m", label: "€700k - €1.5M" },
  { value: "over_1_5m", label: "От €1.5M" },
] as const;

const rentPriceOptions = [
  { value: "all", label: "Любая цена" },
  { value: "under_2500", label: "До €2 500" },
  { value: "2500_3500", label: "€2 500 - €3 500" },
  { value: "over_3500", label: "От €3 500" },
] as const;

type SalePriceFilter = (typeof salePriceOptions)[number]["value"];
type RentPriceFilter = (typeof rentPriceOptions)[number]["value"];
type LocationFilter = "all" | "drawn_area";
type MapPoint = { lat: number; lng: number };

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

type RealEstateCatalogProps = {
  propertiesData: PropertyListing[];
};

export function RealEstateCatalog({ propertiesData }: RealEstateCatalogProps) {
  const [mode, setMode] = useState<ListingMode>("sale");
  const [language, setLanguage] = useState<(typeof languageOptions)[number]["code"]>(
    "ru"
  );
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [bedroomFilter, setBedroomFilter] = useState<string>("all");
  const [featureFilter, setFeatureFilter] = useState<"all" | ListingFeature>("all");
  const [salePriceFilter, setSalePriceFilter] = useState<SalePriceFilter>("all");
  const [rentPriceFilter, setRentPriceFilter] = useState<RentPriceFilter>("all");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("all");
  const [selectedMapPropertyId, setSelectedMapPropertyId] = useState<string | null>(
    null
  );
  const [isDrawingArea, setIsDrawingArea] = useState(false);
  const [draftPolygon, setDraftPolygon] = useState<MapPoint[]>([]);
  const [appliedPolygon, setAppliedPolygon] = useState<MapPoint[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [imageIndexes, setImageIndexes] = useState<Record<string, number>>({});
  const { compareIds, toggleCompare } = useCompareList();

  const cities = useMemo(() => {
    const uniqueCities = new Set(
      propertiesData
        .filter((property) => property.mode === mode)
        .map((property) => property.city)
    );

    return Array.from(uniqueCities).sort((left, right) => left.localeCompare(right));
  }, [mode, propertiesData]);

  const properties = useMemo(() => {
    return propertiesData.filter((property) => {
      if (property.mode !== mode) {
        return false;
      }

      if (cityFilter !== "all" && property.city !== cityFilter) {
        return false;
      }

      if (bedroomFilter !== "all") {
        const minimumBedrooms = Number(bedroomFilter);

        if (Number.isFinite(minimumBedrooms) && property.bedrooms < minimumBedrooms) {
          return false;
        }
      }

      if (featureFilter !== "all" && !property.features.includes(featureFilter)) {
        return false;
      }

      if (mode === "sale") {
        if (salePriceFilter === "under_700k" && property.priceAmount >= 700000) {
          return false;
        }

        if (
          salePriceFilter === "700k_1_5m" &&
          (property.priceAmount < 700000 || property.priceAmount > 1500000)
        ) {
          return false;
        }

        if (salePriceFilter === "over_1_5m" && property.priceAmount < 1500000) {
          return false;
        }
      }

      if (mode === "rent") {
        if (rentPriceFilter === "under_2500" && property.priceAmount >= 2500) {
          return false;
        }

        if (
          rentPriceFilter === "2500_3500" &&
          (property.priceAmount < 2500 || property.priceAmount > 3500)
        ) {
          return false;
        }

        if (rentPriceFilter === "over_3500" && property.priceAmount < 3500) {
          return false;
        }
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
    featureFilter,
    locationFilter,
    mode,
    propertiesData,
    rentPriceFilter,
    salePriceFilter,
  ]);

  const activePriceOptions = mode === "sale" ? salePriceOptions : rentPriceOptions;
  const pageCount = Math.max(1, Math.ceil(properties.length / LISTINGS_PER_PAGE));
  const currentListPage = Math.min(currentPage, pageCount);
  const pagedProperties = useMemo(() => {
    const startIndex = (currentListPage - 1) * LISTINGS_PER_PAGE;
    return properties.slice(startIndex, startIndex + LISTINGS_PER_PAGE);
  }, [currentListPage, properties]);
  const comparedProperties = propertiesData.filter((property) =>
    compareIds.includes(property.id)
  );
  const selectedMapProperty =
    properties.find((property) => property.id === selectedMapPropertyId) ??
    properties[0] ??
    null;

  function resetFilters() {
    setCityFilter("all");
    setBedroomFilter("all");
    setFeatureFilter("all");
    setSalePriceFilter("all");
    setRentPriceFilter("all");
    setLocationFilter("all");
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
    return property.imageGallery[currentIndex] ?? property.imageUrl;
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#f8fbff] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-emerald-900 text-sm font-semibold text-white shadow-sm">
              И
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
                Агентство недвижимости
              </div>
              <div className="text-[2rem] font-semibold leading-none tracking-tight text-slate-950">
                ИРИНА
              </div>
            </div>
          </Link>

          <div className="order-3 flex w-full justify-center lg:order-none lg:w-auto">
            <div className="inline-flex rounded-[20px] border border-slate-200 bg-white p-1.5 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setMode("sale");
                  setCurrentPage(1);
                }}
                className={`rounded-2xl px-9 py-3 text-[1.05rem] font-semibold transition ${
                  mode === "sale"
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
                aria-pressed={mode === "sale"}
              >
                Продажа
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("rent");
                  setCurrentPage(1);
                }}
                className={`rounded-2xl px-9 py-3 text-[1.05rem] font-semibold transition ${
                  mode === "rent"
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
                aria-pressed={mode === "rent"}
              >
                Аренда
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <Link
              href="/compare"
              className="inline-flex h-11 items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800"
            >
              <span>Сравнение</span>
              <span className="rounded-full bg-slate-950 px-2 py-1 text-xs text-white">
                {compareIds.length}
              </span>
            </Link>

            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800"
            >
              <span className="text-base">⌂</span>
              <span>Вход</span>
            </button>

            <div className="flex items-center rounded-[18px] border border-slate-200 bg-white p-1 shadow-sm">
              {languageOptions.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setLanguage(item.code)}
                  className={`rounded-[14px] px-3 py-2 text-sm font-semibold transition sm:px-4 sm:py-2.5 ${
                    language === item.code
                      ? "bg-slate-950 text-white"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                  aria-pressed={language === item.code}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1380px] px-8 py-5">
          <div className="flex flex-col items-center gap-2">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Фильтр
            </div>

            <div className="grid w-full gap-2 rounded-[24px] border border-slate-200 bg-[#fbfdff] p-3 shadow-sm lg:grid-cols-[1.1fr_1fr_0.9fr_1.2fr_1fr_auto]">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Город
                </span>
                <select
                  value={cityFilter}
                  onChange={(event) => {
                    setCityFilter(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="all">Все города</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Цена
                </span>
                <select
                  value={mode === "sale" ? salePriceFilter : rentPriceFilter}
                  onChange={(event) => {
                    if (mode === "sale") {
                      setSalePriceFilter(event.target.value as SalePriceFilter);
                      setCurrentPage(1);
                      return;
                    }

                    setRentPriceFilter(event.target.value as RentPriceFilter);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  {activePriceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Спальни
                </span>
                <select
                  value={bedroomFilter}
                  onChange={(event) => {
                    setBedroomFilter(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="all">Любое число</option>
                  <option value="1">От 1</option>
                  <option value="2">От 2</option>
                  <option value="3">От 3</option>
                  <option value="4">От 4</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Особенность
                </span>
                <select
                  value={featureFilter}
                  onChange={(event) => {
                    setFeatureFilter(event.target.value as "all" | ListingFeature);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  {featureFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Локация
                </span>
                <select
                  value={locationFilter}
                  onChange={(event) => {
                    setLocationFilter(event.target.value as LocationFilter);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="all">Вся карта</option>
                  <option value="drawn_area">В нарисованной области</option>
                </select>
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                >
                  Сбросить
                </button>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <div>
                  Найдено объектов:{" "}
                  <span className="font-semibold text-slate-800">{properties.length}</span>
                </div>
                <div>
                  В сравнении:{" "}
                  <span className="font-semibold text-slate-800">
                    {comparedProperties.length}
                  </span>
                </div>
              </div>

              <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
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
                  Список
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
                  Карта
                </button>
              </div>
            </div>

            {comparedProperties.length > 0 && (
              <div className="flex w-full flex-wrap items-center gap-2 rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm">
                <span className="font-semibold text-slate-900">Сравнение:</span>
                {comparedProperties.map((property) => (
                  <span
                    key={property.id}
                    className="rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700"
                  >
                    {property.title}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="catalog" className="mx-auto flex-1 max-w-[1380px] px-8 pb-16 pt-8">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Каталог объектов
            </div>

            {viewMode === "list" && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-sm text-slate-500">
                  Страница {currentListPage} из {pageCount}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentListPage === 1}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Назад
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
                    Далее
                  </button>
                </div>
              </div>
            )}
          </div>

          {viewMode === "list" ? (
            <>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {pagedProperties.map((property) => {
                  const currentImage = getCurrentImage(property);
                  const imageCount = property.imageGallery.length;
                  const currentImageIndex = imageIndexes[property.id] ?? 0;
                  const isCompared = compareIds.includes(property.id);

                  return (
                    <article
                      key={property.id}
                      className="group overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]"
                    >
                      <div className="relative">
                        <img
                          src={currentImage}
                          alt={property.title}
                          className="h-48 w-full object-cover"
                        />

                        <div className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 shadow-sm">
                          {property.mode === "sale" ? "Продажа" : "Аренда"}
                        </div>

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
                              {property.title}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                              {property.city}, {property.district}, {property.country}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-[#eef6f4] px-4 py-2 text-sm font-semibold leading-tight text-emerald-900">
                            {property.priceLabel}
                          </div>
                        </div>

                        <p className="text-sm leading-5 text-slate-600">
                          {property.shortDescription}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {property.features.slice(0, 4).map((feature) => (
                            <span
                              key={feature}
                              className="rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600"
                            >
                              {getFeatureLabel(feature)}
                            </span>
                          ))}
                        </div>

                        <div className="grid gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600 sm:grid-cols-3">
                          <div>
                            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                              Площадь
                            </div>
                            <div className="mt-1 font-semibold text-slate-900">
                              {property.areaM2} м²
                            </div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                              Спальни
                            </div>
                            <div className="mt-1 font-semibold text-slate-900">
                              {property.bedrooms}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                              Ванные
                            </div>
                            <div className="mt-1 font-semibold text-slate-900">
                              {property.bathrooms}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                          <div className="text-xs text-slate-500">
                            ID объекта:{" "}
                            <span className="font-semibold text-slate-700">
                              {property.id}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">
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
                                ? "В списке сравнения"
                                : "Добавить в сравнение"}
                            </button>
                            <a
                              href={property.location.googleMapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                            >
                              Карта
                            </a>
                            <Link
                              href={`/properties/${property.slug}`}
                              className="rounded-xl bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                              Открыть карточку
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

                  return (
                    <button
                      key={property.id}
                      type="button"
                      onClick={() => setSelectedMapPropertyId(property.id)}
                      className={`w-full max-w-[360px] self-start rounded-[24px] border p-3 text-left transition ${
                        isActive
                          ? "border-emerald-400 bg-emerald-50/60 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex gap-3">
                        <img
                          src={property.imageGallery[0] ?? property.imageUrl}
                          alt={property.title}
                          className="h-24 w-24 shrink-0 rounded-[18px] object-cover"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="line-clamp-2 text-base font-semibold leading-tight text-slate-950">
                                {property.title}
                              </div>
                              <div className="mt-1 line-clamp-1 text-sm text-slate-500">
                                {property.location.addressLabel}
                              </div>
                            </div>
                            <div className="shrink-0 rounded-2xl bg-white px-3 py-2 text-sm font-semibold leading-tight text-emerald-900 shadow-sm">
                              {property.priceLabel}
                            </div>
                          </div>

                          <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">
                            {property.shortDescription}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span>{property.areaM2} м²</span>
                            <span>•</span>
                            <span>{property.bedrooms} спальни</span>
                            <span>•</span>
                            <span>{property.bathrooms} ванные</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <a
                          href={property.location.googleMapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                        >
                          Карта
                        </a>
                        <Link
                          href={`/properties/${property.slug}`}
                          onClick={(event) => event.stopPropagation()}
                          className="rounded-2xl bg-slate-950 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-slate-800"
                        >
                          Объект
                        </Link>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
                  <div>
                    <div className="text-lg font-semibold text-slate-950">
                      Карта Португалии
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      Можно отметить многоугольник и отфильтровать объекты внутри
                      выбранной области.
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
                      {isDrawingArea ? "Рисование..." : "Нарисовать область"}
                    </button>

                    <button
                      type="button"
                      onClick={applyPolygonSelection}
                      disabled={draftPolygon.length < 3}
                      className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Применить область
                    </button>

                    <button
                      type="button"
                      onClick={clearPolygonSelection}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                    >
                      Очистить
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
                    Открыть в Google Maps
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
                      Кликайте по карте, чтобы поставить точки области
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
                  <div>
                    {appliedPolygon.length >= 3
                      ? "Фильтр по нарисованной области активен."
                      : "Чтобы отбирать объекты по области, нажми «Нарисовать область» и отметь минимум 3 точки."}
                  </div>
                  <div className="font-semibold text-slate-900">
                    Точек в области: {(draftPolygon.length > 0 ? draftPolygon : appliedPolygon).length}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-[#0f172a] text-slate-200">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4">
            <div className="text-lg font-semibold">Агентство недвижимости ИРИНА</div>
            <p className="max-w-2xl text-sm leading-7 text-slate-300">
              Информация на сайте носит ознакомительный характер и не является
              публичной офертой. Точные условия сделки, доступность объекта,
              состав мебели и юридические детали подтверждаются отдельно перед
              бронированием, арендой или подписанием договора купли-продажи.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Юридическая информация
            </div>
            <ul className="grid gap-3 text-sm leading-6 text-slate-300">
              <li>Проверка статуса объекта и документов проводится до сделки.</li>
              <li>Финальная стоимость может меняться из-за налогов и сборов.</li>
              <li>Персональные данные клиентов обрабатываются по запросу сделки.</li>
              <li>Cookies используются для хранения предпочтений и аналитики.</li>
            </ul>
          </div>
        </div>
      </footer>
    </main>
  );
}
