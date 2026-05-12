"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  getPropertyCoverImage,
  getPropertyImageStyle,
} from "@/lib/real-estate/property-cover";
import {
  conditionTranslations,
  featureTranslations,
  formatPropertyPrice,
  heatingTranslations,
  propertyTypeTranslations,
  siteTranslations,
  transportModeTranslations,
  type SiteLocale,
} from "@/lib/i18n/site";
import { useSiteLocale } from "@/lib/i18n/use-site-locale";
import type {
  EnergyRating,
  HeatingType,
  PropertyCondition,
  PropertyListing,
  PropertyType,
} from "@/lib/real-estate/types";
import { useCompareList } from "@/lib/real-estate/useCompareList";
import { LanguageSwitcher } from "./LanguageSwitcher";

type PropertyDetailPageProps = {
  property: PropertyListing;
};

const propertyTypeLabels: Record<PropertyType, string> = {
  apartment: "Квартира",
  duplex: "Дуплекс",
  land: "Участок",
  loft: "Лофт",
  penthouse: "Пентхаус",
  room: "Комната",
  studio: "Студия",
  townhouse: "Таунхаус",
  villa: "Вилла",
};

const conditionLabels: Record<PropertyCondition, string> = {
  excellent: "В отличном состоянии",
  good: "Хорошее состояние",
  needs_renovation: "Нужен ремонт",
  new_build: "Новостройка",
};

const heatingLabels: Record<HeatingType, string> = {
  gas_boiler: "Газовый котел",
  central: "Центральное отопление",
  electric: "Электрическое отопление",
  heat_pump: "Тепловой насос",
  none: "Без отопления",
  underfloor: "Теплый пол",
};

type MessengerOption = "whatsapp" | "telegram" | "viber" | "signal";

const messengerLabels: Array<{ value: MessengerOption; label: string }> = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" },
  { value: "viber", label: "Viber" },
  { value: "signal", label: "Signal" },
];

function getPropertyPublicPath(property: PropertyListing) {
  const generatedIdSlug = property.id.replace(/^irina-/, "");
  const pathSlug = /^irina-\d+$/.test(property.id) ? generatedIdSlug : property.slug;

  return `/properties/${encodeURIComponent(pathSlug)}`;
}

function getPropertyPublicReference(property: PropertyListing) {
  return property.id.replace(/^irina-/, "");
}

function getPropertyContentForLocale(property: PropertyListing, locale: SiteLocale) {
  const translation = property.translations?.[locale];
  const isFallback = locale !== (property.sourceLocale ?? "ru") && !translation;

  return {
    title: translation?.title || property.title,
    city: translation?.city || property.city,
    shortDescription: translation?.shortDescription || property.shortDescription,
    fullDescription: translation?.fullDescription || property.fullDescription,
    orientation: translation?.orientation?.length
      ? translation.orientation
      : property.details.orientation,
    isFallback,
  };
}

function isAiGeneratedImage(property: PropertyListing, imageUrl: string) {
  return property.imageSources?.[imageUrl] === "ai_generated";
}

function getFeatureLabel(feature: PropertyListing["features"][number]) {
  return featureTranslations.ru[feature] ?? feature;
}

function formatArea(value: number) {
  return `${value} m²`;
}

function formatFloorLabel(value: string, locale: SiteLocale) {
  const floorNumber = value.trim().match(/\d+/)?.[0];

  if (!floorNumber) {
    return value;
  }

  if (locale === "pt") return `${floorNumber} piso`;
  if (locale === "en") return `${floorNumber} floor`;
  if (locale === "uk") return `${floorNumber} поверх`;

  return `${floorNumber} этаж`;
}

function translateOrientationValue(value: string, locale: SiteLocale) {
  const normalizedValue = value.trim().toLowerCase();
  const translations: Record<string, Record<SiteLocale, string>> = {
    north: { pt: "norte", en: "north", ru: "север", uk: "північ" },
    south: { pt: "sul", en: "south", ru: "юг", uk: "південь" },
    east: { pt: "este", en: "east", ru: "восток", uk: "схід" },
    west: { pt: "oeste", en: "west", ru: "запад", uk: "захід" },
    "север": { pt: "norte", en: "north", ru: "север", uk: "північ" },
    "юг": { pt: "sul", en: "south", ru: "юг", uk: "південь" },
    "восток": { pt: "este", en: "east", ru: "восток", uk: "схід" },
    "запад": { pt: "oeste", en: "west", ru: "запад", uk: "захід" },
  };

  return translations[normalizedValue]?.[locale] ?? value;
}

function buildContactMessage(property: PropertyListing, locale: SiteLocale) {
  const content = getPropertyContentForLocale(property, locale);
  const modeLabel = property.mode === "rent" ? siteTranslations[locale].rent : siteTranslations[locale].sale;

  if (locale === "pt") {
    return `Ola! Tenho interesse no imovel ${getPropertyPublicReference(property)} - ${content.title}/${modeLabel}`;
  }

  if (locale === "en") {
    return `Hello! I am interested in property ${getPropertyPublicReference(property)} - ${content.title}/${modeLabel}`;
  }

  if (locale === "uk") {
    return `Вітаю! Мене цікавить об'єкт ${getPropertyPublicReference(property)} - ${content.title}/${modeLabel}`;
  }

  return `Здравствуйте! Меня интересует объект ${getPropertyPublicReference(property)} - ${content.title}/${modeLabel}`;
}

const displayPropertyTypeLabels: Record<PropertyType, string> = {
  apartment: "Квартира",
  duplex: "Дуплекс",
  land: "Участок",
  loft: "Лофт",
  penthouse: "Пентхаус",
  room: "Комната",
  studio: "Студия",
  townhouse: "Таунхаус",
  villa: "Вилла",
};

const displayConditionLabels: Record<PropertyCondition, string> = {
  excellent: "В отличном состоянии",
  good: "Хорошее состояние",
  needs_renovation: "Нужен ремонт",
  new_build: "Новостройка",
};

const displayHeatingLabels: Record<HeatingType, string> = {
  gas_boiler: "Газовый котел",
  central: "Центральное отопление",
  electric: "Электрическое отопление",
  heat_pump: "Тепловой насос",
  none: "Без отопления",
  underfloor: "Теплый пол",
};

function getPropertyTags(property: PropertyListing, locale?: SiteLocale): string[] {
  if (locale) {
    const featureLabels = featureTranslations[locale];
    const localizedTags = new Set<string>(
      property.features.map((feature) => featureLabels[feature] ?? getFeatureLabel(feature))
    );

    if (property.details.storageRoom) localizedTags.add(featureLabels.storageRoom);
    if (property.details.elevator) localizedTags.add(featureLabels.elevator);
    if (property.details.equippedKitchen) localizedTags.add(featureLabels.equippedKitchen);
    if (property.details.builtInWardrobes) localizedTags.add(featureLabels.builtInWardrobes);
    if (property.details.parkingSpaces > 0) localizedTags.add(featureLabels.parking);
    if (property.details.balconyCount > 0) localizedTags.add(featureLabels.balcony);
    if (property.details.terraceCount > 0) localizedTags.add(featureLabels.terrace);

    return Array.from(localizedTags);
  }

  const tags = new Set<string>(property.features.map((feature) => getFeatureLabel(feature)));

  if (property.details.storageRoom) tags.add("Кладовая");
  if (property.details.elevator) tags.add("Лифт");
  if (property.details.equippedKitchen) tags.add("Оснащенная кухня");
  if (property.details.builtInWardrobes) tags.add("Встроенные шкафы");
  if (property.details.parkingSpaces > 0) tags.add("Паркинг");
  if (property.details.balconyCount > 0) tags.add("Балкон");
  if (property.details.terraceCount > 0) tags.add("Терраса");

  return Array.from(tags);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M15 8a3 3 0 1 0-2.83-4H12a3 3 0 0 0 .17 1L8.91 7.02a3 3 0 0 0-2.82-.08l-1.8-1.8A3 3 0 1 0 3 6a2.99 2.99 0 0 0 .38 1.46l1.8 1.8a3 3 0 0 0 0 5.48l-1.8 1.8A3 3 0 1 0 4.29 18l1.8-1.8a3 3 0 0 0 2.82-.08l3.26 2.1A3 3 0 1 0 12 19a2.99 2.99 0 0 0 .17 1H12a3 3 0 0 0 2.83-4l-3.26-2.1a3 3 0 0 0 0-3.6L14.83 8A2.99 2.99 0 0 0 15 8Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M8 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2Zm2-2v2h4a2 2 0 0 1 2 2v4h2V5h-8Zm4 4H6v8h8V9Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CompareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M10 4H4v6h2V7.41l4.29 4.3 1.42-1.42L7.41 6H10V4Zm4 0v2h2.59l-4.3 4.29 1.42 1.42 4.29-4.3V10h2V4h-6ZM6 14H4v6h6v-2H7.41l4.3-4.29-1.42-1.42-4.3 4.29V14Zm14 0h-2v2.59l-4.29-4.3-1.42 1.42 4.3 4.29H14v2h6v-6Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PropertyDetailPage({ property }: PropertyDetailPageProps) {
  const [language, setSiteLanguage] = useSiteLocale();
  const t = siteTranslations[language];
  const localizedPropertyTypeLabels = propertyTypeTranslations[language];
  const localizedProperty = getPropertyContentForLocale(property, language);
  const localizedPrice = formatPropertyPrice(property.priceAmount, property.mode, language);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showTaxCalculator, setShowTaxCalculator] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactMessengers, setContactMessengers] = useState<MessengerOption[]>([]);
  const [contactMessage, setContactMessage] = useState(
    buildContactMessage(property, language)
  );
  const [contactSubmitState, setContactSubmitState] = useState<
    "idle" | "error" | "success"
  >("idle");
  const { compareIds, toggleCompare } = useCompareList();
  const isCompared = compareIds.includes(property.id);

  const propertyUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return getPropertyPublicPath(property);
    }

    return `${window.location.origin}${getPropertyPublicPath(property)}`;
  }, [property]);

  const taxEstimate = useMemo(() => {
    if (property.mode !== "sale") {
      return null;
    }

    const taxProfile = property.taxProfile ?? {
      propertyTransferTaxRate: 0.06,
      stampDutyRate: 0.008,
      notaryEstimateRate: 0.01,
    };
    const transferTax = property.priceAmount * taxProfile.propertyTransferTaxRate;
    const stampDuty = property.priceAmount * taxProfile.stampDutyRate;
    const notaryCosts = property.priceAmount * taxProfile.notaryEstimateRate;

    return {
      transferTax,
      stampDuty,
      notaryCosts,
      total: transferTax + stampDuty + notaryCosts,
    };
  }, [property]);

  const propertyTags = useMemo(() => getPropertyTags(property, language), [language, property]);

  const summaryStats = useMemo(() => {
    if (property.details.propertyType === "land") {
      return [
        { label: "Площадь", value: `${property.areaM2} м²` },
        { label: "Тип объекта", value: displayPropertyTypeLabels[property.details.propertyType] },
      ];
    }

    return [
      { label: "Площадь", value: `${property.areaM2} м²` },
      { label: "Спальни", value: String(property.bedrooms) },
      { label: "Тип объекта", value: displayPropertyTypeLabels[property.details.propertyType] },
    ];
  }, [property]);

  const detailCharacteristics = useMemo(() => {
    const propertyType = property.details.propertyType;
    const isLand = propertyType === "land";
    const hasAttachedLand = ["villa", "townhouse"].includes(propertyType);
    const items: Array<{ label: string; value: string }> = [
      { label: "Тип объекта", value: displayPropertyTypeLabels[property.details.propertyType] },
      { label: "Состояние", value: displayConditionLabels[property.details.condition] },
      { label: "Площадь", value: `${property.areaM2} м²` },
    ];

    if (!isLand && property.details.usableAreaM2 > 0 && property.details.usableAreaM2 !== property.areaM2) {
      items.push({ label: "Полезная площадь", value: `${property.details.usableAreaM2} м²` });
    }

    if (hasAttachedLand && property.details.plotAreaM2 && property.details.plotAreaM2 > 0) {
      items.push({ label: "Участок", value: `${property.details.plotAreaM2} м²` });
    }

    if (!isLand && property.details.floor) {
      items.push({ label: "Этаж", value: property.details.floor });
    }

    if (!isLand && property.details.buildingFloors && property.details.buildingFloors > 0) {
      items.push({ label: "Этажность", value: String(property.details.buildingFloors) });
    }

    if (property.details.yearBuilt > 0) {
      items.push({ label: "Год постройки", value: String(property.details.yearBuilt) });
    }

    if (!isLand) {
      items.push(
        { label: "Спальни", value: String(property.bedrooms) },
        { label: "Ванные", value: String(property.bathrooms) }
      );
    }

    if (property.details.parkingSpaces > 0) {
      items.push({ label: "Парк. мест", value: String(property.details.parkingSpaces) });
    }

    if (property.details.balconyCount > 0) {
      items.push({ label: "Балконы", value: String(property.details.balconyCount) });
    }

    if (property.details.terraceCount > 0) {
      items.push({ label: "Террасы", value: String(property.details.terraceCount) });
    }

    if (!isLand) {
      items.push(
        { label: "Энергокласс", value: property.details.energyRating },
        { label: "Отопление", value: displayHeatingLabels[property.details.heating] },
        { label: "Ориентация", value: property.details.orientation.join(", ") }
      );
    }

    if (property.details.elevator) items.push({ label: "Лифт", value: "Да" });
    if (property.details.storageRoom) items.push({ label: "Кладовая", value: "Есть" });
    if (property.details.builtInWardrobes) items.push({ label: "Встроенные шкафы", value: "Есть" });
    if (property.details.equippedKitchen) items.push({ label: "Оснащенная кухня", value: "Да" });
    if (property.details.furnished) items.push({ label: "Меблировка", value: "Да" });
    if (property.details.exterior) items.push({ label: "Наружное расположение", value: "Да" });
    if (property.details.accessibilityAdapted) {
      items.push({ label: "Адаптировано", value: "Да" });
    }

    return items;
  }, [property]);
  void summaryStats;
  void detailCharacteristics;

  const cardSummaryStats = useMemo(() => {
    if (property.details.propertyType === "land") {
      return [
        { label: t.area, value: formatArea(property.areaM2) },
        { label: t.propertyType, value: localizedPropertyTypeLabels[property.details.propertyType] },
      ];
    }

    return [
      { label: t.area, value: formatArea(property.areaM2) },
      { label: t.bedrooms, value: String(property.bedrooms) },
      { label: t.propertyType, value: localizedPropertyTypeLabels[property.details.propertyType] },
    ];
  }, [localizedPropertyTypeLabels, property, t]);

  const cardCharacteristics = useMemo(() => {
    const propertyType = property.details.propertyType;
    const isLand = propertyType === "land";
    const hasAttachedLand = ["villa", "townhouse"].includes(propertyType);

    const items: Array<{ label: string; value: string }> = [
      { label: t.propertyType, value: localizedPropertyTypeLabels[propertyType] },
      { label: t.condition, value: conditionTranslations[language][property.details.condition] },
      { label: t.area, value: formatArea(property.areaM2) },
    ];

    if (isLand) {
      return items;
    }

    if (property.details.floor) {
      items.push({ label: t.floor, value: formatFloorLabel(property.details.floor, language) });
    }

    if (property.details.buildingFloors && property.details.buildingFloors > 0) {
      items.push({ label: t.floors, value: String(property.details.buildingFloors) });
    }

    if (property.details.yearBuilt > 0) {
      items.push({ label: t.yearBuilt, value: String(property.details.yearBuilt) });
    }

    items.push(
      { label: t.bedrooms, value: String(property.bedrooms) },
      { label: t.bathrooms, value: String(property.bathrooms) }
    );

    if (property.details.balconyCount > 0) {
      items.push({ label: t.balconies, value: String(property.details.balconyCount) });
    }

    if (property.details.parkingSpaces > 0) {
      items.push({ label: t.parkingSpaces, value: String(property.details.parkingSpaces) });
    }

    if (hasAttachedLand && property.details.plotAreaM2 && property.details.plotAreaM2 > 0) {
      items.push({ label: t.plotArea, value: formatArea(property.details.plotAreaM2) });
    }

    if (hasAttachedLand && property.details.terraceCount > 0) {
      items.push({ label: t.terraces, value: String(property.details.terraceCount) });
    }

    items.push(
      { label: t.energyRating, value: property.details.energyRating },
      { label: t.heating, value: heatingTranslations[language][property.details.heating] },
      {
        label: t.orientation,
        value: localizedProperty.orientation
          .map((item) => translateOrientationValue(item, language))
          .join(", "),
      }
    );

    return items;
  }, [language, localizedProperty.orientation, localizedPropertyTypeLabels, property, t]);

  async function handleCopyLink() {
    await navigator.clipboard.writeText(propertyUrl);
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1800);
  }

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({
        title: localizedProperty.title,
        text: `${localizedProperty.title} — ${localizedPrice}`,
        url: propertyUrl,
      });
      return;
    }

    await handleCopyLink();
  }

  function toggleMessenger(messenger: MessengerOption) {
    setContactMessengers((currentMessengers) =>
      currentMessengers.includes(messenger)
        ? currentMessengers.filter((item) => item !== messenger)
        : [...currentMessengers, messenger]
    );
    setContactSubmitState("idle");
  }

  function handleSiteLanguageChange(nextLanguage: SiteLocale) {
    setSiteLanguage(nextLanguage);
    setContactMessage(buildContactMessage(property, nextLanguage));
  }

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (contactPhone.trim().length === 0) {
      setContactSubmitState("error");
      return;
    }

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "property_request",
          name: contactName,
          phone: contactPhone,
          messengers: contactMessengers,
          message: contactMessage,
          propertyId: property.id,
          propertySlug: property.slug,
          propertyTitle: localizedProperty.title,
        }),
      });

      if (!response.ok) {
        setContactSubmitState("error");
        return;
      }

      setContactSubmitState("success");
      setContactName("");
      setContactPhone("");
      setContactMessengers([]);
      setContactMessage(buildContactMessage(property, language));
    } catch {
      setContactSubmitState("error");
    }
  }

  return (
    <main className="site-page-background min-h-screen px-4 py-5 text-slate-950 sm:px-5 md:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 grid justify-items-center gap-3 md:flex md:flex-wrap md:items-center md:justify-between">
          <Link
            href="/"
            className="w-full max-w-[360px] rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800 md:w-fit"
          >
            {t.catalog}
          </Link>

          <div className="grid w-full max-w-[360px] grid-cols-2 gap-2 md:flex md:max-w-none md:w-auto md:flex-wrap md:items-center">
            <LanguageSwitcher
              language={language}
              onChange={handleSiteLanguageChange}
              className="col-span-2 flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm md:col-span-1"
              buttonClassName="rounded-xl px-3 py-1.5 text-xs font-semibold transition"
            />
            <button
              type="button"
              onClick={() => toggleCompare(property.id)}
              className={`col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-semibold transition md:col-span-1 md:h-auto md:px-4 md:py-2.5 ${
                isCompared
                  ? "border border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-800"
              }`}
            >
              <CompareIcon />
              {isCompared ? t.compared : t.addCompare}
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800 md:col-span-1 md:h-auto md:px-4 md:py-2.5"
            >
              <CopyIcon />
              {copyState === "copied" ? "OK" : t.copy}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800 md:h-auto md:px-4 md:py-2.5"
            >
              <ShareIcon />
              {t.share}
            </button>
            <a
              href={property.location.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800 md:h-auto md:px-4 md:py-2.5"
            >
              {t.openGoogleMaps}
            </a>
            <div className="col-span-2 justify-self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 md:col-span-1">
              ID: {getPropertyPublicReference(property)}
            </div>
          </div>
        </div>

        <article className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="relative">
            {isAiGeneratedImage(
              property,
              property.imageGallery[activeImageIndex] ?? getPropertyCoverImage(property)
            ) ? (
              <div className="absolute bottom-4 left-4 z-10 rounded-full bg-slate-950/80 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                AI
              </div>
            ) : null}
            <img
              src={property.imageGallery[activeImageIndex] ?? getPropertyCoverImage(property)}
              alt={`${localizedProperty.title} ${activeImageIndex + 1}`}
              className="h-[440px] w-full object-cover md:h-[520px]"
              style={getPropertyImageStyle(
                property,
                property.imageGallery[activeImageIndex] ?? getPropertyCoverImage(property)
              )}
            />

            {property.imageGallery.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActiveImageIndex((current) =>
                      (current - 1 + property.imageGallery.length) %
                      property.imageGallery.length
                    )
                  }
                  className="absolute left-4 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl font-semibold text-slate-900 shadow-sm"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveImageIndex((current) =>
                      (current + 1) % property.imageGallery.length
                    )
                  }
                  className="absolute right-4 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl font-semibold text-slate-900 shadow-sm"
                >
                  ›
                </button>
              </>
            )}
          </div>

          <div className="border-b border-slate-100 bg-white px-6 py-3 md:px-8">
            <div className="flex flex-wrap gap-2">
              {property.imageGallery.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setActiveImageIndex(index)}
                  className={`relative overflow-hidden rounded-2xl border ${
                    index === activeImageIndex
                      ? "border-emerald-500 ring-2 ring-emerald-100"
                      : "border-slate-200"
                  }`}
                >
                  {isAiGeneratedImage(property, image) ? (
                    <span className="absolute bottom-1 left-1 z-10 rounded-full bg-slate-950/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white">
                      AI
                    </span>
                  ) : null}
                  <img
                    src={image}
                    alt={`${localizedProperty.title} ${index + 1}`}
                    className="h-16 w-24 object-cover"
                    style={getPropertyImageStyle(property, image)}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid items-start gap-6 p-5 md:p-6 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="grid gap-5 self-start">
              <div className="grid gap-2">
                <div className="inline-flex w-fit rounded-full bg-[#eef6f4] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900">
                  {property.mode === "sale" ? t.sale : t.rent}
                </div>

                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-[2rem]">
                  {localizedProperty.title}
                </h1>
                {localizedProperty.isFallback ? (
                  <div className="w-fit rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    default
                  </div>
                ) : null}

                <p className="text-sm text-slate-500 md:text-base">
                  {localizedProperty.city}, {property.district}, {property.country}
                </p>
              </div>

              <p className="max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
                {localizedProperty.fullDescription}
              </p>

              <div className="flex flex-wrap items-start content-start gap-2 self-start">
                {propertyTags.map((featureLabel) => (
                  <span
                    key={featureLabel}
                    className="inline-flex w-fit shrink-0 self-start whitespace-nowrap rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium leading-none text-slate-700"
                  >
                    {featureLabel}
                  </span>
                ))}
              </div>

              <section className="hidden">
                <h2 className="text-lg font-semibold text-slate-950">{t.characteristics}</h2>
                <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                  <div>Тип объекта: {propertyTypeLabels[property.details.propertyType]}</div>
                  <div>Состояние: {conditionLabels[property.details.condition]}</div>
                  <div>Полезная площадь: {property.details.usableAreaM2} м²</div>
                  <div>Площадь застройки: {property.details.builtAreaM2} м²</div>
                  {property.details.plotAreaM2 ? (
                    <div>Участок: {property.details.plotAreaM2} м²</div>
                  ) : null}
                  <div>Этаж: {property.details.floor ?? "Не указан"}</div>
                  <div>Год постройки: {property.details.yearBuilt}</div>
                  <div>Энергетический сертификат: {property.details.energyRating as EnergyRating}</div>
                  <div>Отопление: {heatingLabels[property.details.heating]}</div>
                  <div>Ориентация: {property.details.orientation.join(", ")}</div>
                  <div>Парковка: {property.details.parkingSpaces} мест</div>
                  <div>Лифт: {property.details.elevator ? "Да" : "Нет"}</div>
                  <div>Кладовая: {property.details.storageRoom ? "Есть" : "Нет"}</div>
                  <div>Встроенные шкафы: {property.details.builtInWardrobes ? "Есть" : "Нет"}</div>
                  <div>Оснащенная кухня: {property.details.equippedKitchen ? "Да" : "Нет"}</div>
                  <div>Меблировка: {property.details.furnished ? "Да" : "Нет"}</div>
                  <div>Балконы: {property.details.balconyCount}</div>
                  <div>Террасы: {property.details.terraceCount}</div>
                  <div>Наружное расположение: {property.details.exterior ? "Да" : "Нет"}</div>
                  <div>
                    Адаптировано для маломобильных:
                    {" "}
                    {property.details.accessibilityAdapted ? "Да" : "Нет"}
                  </div>
                </div>
              </section>

              <section className="grid gap-3 rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                <h2 className="text-lg font-semibold text-slate-950">{t.characteristics}</h2>
                <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                  {cardCharacteristics.map((item) => (
                    <div key={item.label}>
                      {item.label}: {item.value}
                    </div>
                  ))}
                </div>
              </section>

            </div>

            <aside className="grid gap-3 self-start rounded-[28px] bg-slate-50 p-4">
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {t.priceBlock}
                </div>
                <div className="mt-1 text-[2rem] font-semibold text-slate-950">
                  {localizedPrice}
                </div>
              </div>

              <div className="hidden">
                <div className="grid grid-cols-3 gap-3 text-sm text-slate-600">
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
              </div>

              <div className="grid gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                  {cardSummaryStats.map((item) => (
                    <div key={item.label}>
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        {item.label}
                      </div>
                      <div className="mt-1 font-semibold text-slate-900">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <section className="grid gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">{t.transportAccess}</h2>
                <div className="grid gap-2">
                  {property.transportAccess.map((route) => (
                    <div
                      key={`${route.mode}-${route.route}-${route.stopName}`}
                      className="rounded-2xl bg-slate-50 px-4 py-2.5 text-sm text-slate-700"
                    >
                      <div className="font-semibold text-slate-950">
                        {transportModeTranslations[language][route.mode]} {route.route}
                      </div>
                      <div className="mt-1">
                        {t.stop}: {route.stopName} · {t.walk} {route.walkMinutes} {t.minutesShort}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {property.mode === "sale" && taxEstimate ? (
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        {t.taxesAndFees}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {t.taxesHint}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowTaxCalculator((current) => !current)}
                      className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      {t.taxCalculator}
                    </button>
                  </div>

                  {showTaxCalculator ? (
                    <div className="mt-3 grid gap-2 text-sm text-slate-700">
                      <div className="rounded-2xl bg-slate-50 px-4 py-2.5">
                        IMT: {formatMoney(taxEstimate.transferTax)}
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-2.5">
                        {t.stampDuty}: {formatMoney(taxEstimate.stampDuty)}
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-2.5">
                        {t.notaryRegistration}: {formatMoney(taxEstimate.notaryCosts)}
                      </div>
                      <div className="rounded-2xl bg-[#eef6f4] px-4 py-2.5 font-semibold text-emerald-900">
                        {t.estimatedTotal}: {formatMoney(taxEstimate.total)}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    {t.realtorContact}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowContactForm((current) => !current)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                  >
                    {t.contactRealtor}
                  </button>
                </div>

                {showContactForm ? (
                  <form
                    className="mt-3 grid gap-3"
                    onSubmit={handleContactSubmit}
                  >
                    <input
                      type="text"
                      value={contactName}
                      onChange={(event) => setContactName(event.target.value)}
                      placeholder={t.yourName}
                      className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
                    />
                    <div className="grid gap-2">
                      <input
                        type="tel"
                        required
                        value={contactPhone}
                        onChange={(event) => setContactPhone(event.target.value)}
                        placeholder={t.phoneRequired}
                        className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
                      />
                      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-[#fbfdff] px-3 py-3">
                        {messengerLabels.map((messenger) => {
                          const isChecked = contactMessengers.includes(messenger.value);

                          return (
                            <label
                              key={messenger.value}
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                                isChecked
                                  ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                                  : "border-slate-200 bg-white text-slate-700"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleMessenger(messenger.value)}
                                className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                              />
                              {messenger.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <textarea
                      value={contactMessage}
                      onChange={(event) => setContactMessage(event.target.value)}
                      className="min-h-[104px] rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
                    />
                    {contactSubmitState === "error" ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {t.phoneRequiredError}
                      </div>
                    ) : contactSubmitState === "success" ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {t.inquirySent}
                      </div>
                    ) : null}
                    <button
                      type="submit"
                      className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      {t.submitInquiry}
                    </button>
                  </form>
                ) : null}
              </div>
            </aside>
          </div>
        </article>
      </div>
    </main>
  );
}
