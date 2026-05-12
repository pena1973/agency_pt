"use client";

import Link from "next/link";
import {
  featureTranslations,
  formatPropertyPrice,
  siteTranslations,
  type SiteLocale,
} from "@/lib/i18n/site";
import { getPropertyCoverImage } from "@/lib/real-estate/property-cover";
import type { PropertyListing } from "@/lib/real-estate/types";
import { useSiteLocale } from "@/lib/i18n/use-site-locale";
import { useCompareList } from "@/lib/real-estate/useCompareList";
import { LanguageSwitcher } from "./LanguageSwitcher";

type ComparePageProps = {
  propertiesData: PropertyListing[];
};

function getLocalizedPropertyContent(property: PropertyListing, locale: SiteLocale) {
  const translation = property.translations?.[locale];

  return {
    title: translation?.title || property.title,
    city: translation?.city || property.city,
    shortDescription: translation?.shortDescription || property.shortDescription,
  };
}

export function ComparePage({ propertiesData }: ComparePageProps) {
  const [language, setSiteLanguage] = useSiteLocale();
  const { compareIds, removeCompare, clearCompare } = useCompareList();
  const t = siteTranslations[language];
  const comparedProperties = propertiesData.filter((property) =>
    compareIds.includes(property.id)
  );
  const comparisonRows = [
    {
      label: t.price,
      render: (property: PropertyListing) =>
        formatPropertyPrice(property.priceAmount, property.mode, language),
    },
    {
      label: t.area,
      render: (property: PropertyListing) => `${property.areaM2} m²`,
    },
    {
      label: t.bedrooms,
      render: (property: PropertyListing) => String(property.bedrooms ?? "—"),
    },
    {
      label: t.bathrooms,
      render: (property: PropertyListing) => String(property.bathrooms ?? "—"),
    },
    {
      label: t.location,
      render: (property: PropertyListing) => property.location.addressLabel,
    },
    {
      label: t.shortDescription,
      render: (property: PropertyListing) =>
        getLocalizedPropertyContent(property, language).shortDescription,
    },
    {
      label: t.features,
      render: (property: PropertyListing) =>
        property.features.map((feature) => featureTranslations[language][feature]).join(", ") || "—",
    },
  ];

  if (comparedProperties.length === 0) {
    return (
      <main className="site-page-background min-h-screen px-8 py-10 text-slate-950">
        <div className="mx-auto max-w-5xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                {t.compare}
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                {language === "pt"
                  ? "A lista de comparacao esta vazia"
                  : language === "en"
                  ? "The compare list is empty"
                  : language === "uk"
                  ? "Список порівняння поки порожній"
                  : "Список сравнения пока пуст"}
              </h1>
            </div>

            <Link
              href="/"
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {t.backToCatalog}
            </Link>
            <LanguageSwitcher language={language} onChange={setSiteLanguage} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="site-page-background min-h-screen px-4 py-6 text-slate-950 sm:px-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-[1380px]">
        <div className="mb-6 grid gap-4 md:flex md:flex-wrap md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              {t.compare}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
              {language === "pt"
                ? "Tabela de comparacao"
                : language === "en"
                ? "Comparison table"
                : language === "uk"
                ? "Таблиця порівняння"
                : "Таблица сравнения"}
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <LanguageSwitcher language={language} onChange={setSiteLanguage} />
            <button
              type="button"
              onClick={clearCompare}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 sm:px-4 sm:py-3"
            >
              {t.clear}
            </button>
            <Link
              href="/"
              className="rounded-2xl bg-slate-950 px-3 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-800 sm:px-5 sm:py-3"
            >
              {t.backToCatalog}
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:hidden">
          {comparedProperties.map((property) => {
            const localizedProperty = getLocalizedPropertyContent(property, language);

            return (
            <article
              key={property.id}
              className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm"
            >
              <img
                src={getPropertyCoverImage(property)}
                alt={localizedProperty.title}
                className="h-48 w-full object-cover"
              />
              <div className="grid gap-4 p-4">
                <div>
                  <div className="text-lg font-semibold leading-tight text-slate-950">
                    {localizedProperty.title}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {localizedProperty.city}, {property.district}, {property.country}
                  </div>
                </div>

                <div className="grid gap-2">
                  {comparisonRows.map((row) => (
                    <div
                      key={`${row.label}-${property.id}`}
                      className="rounded-2xl bg-slate-50 px-4 py-3"
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        {row.label}
                      </div>
                      <div className="mt-1 text-sm leading-6 text-slate-700">
                        {row.render(property)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => removeCompare(property.id)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700"
                  >
                    {language === "pt"
                      ? "Remover"
                      : language === "en"
                      ? "Remove"
                      : language === "uk"
                      ? "Виключити"
                      : "Исключить"}
                  </button>
                  <Link
                    href={`/properties/${property.slug}`}
                    className="rounded-xl bg-slate-950 px-3 py-2.5 text-center text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    {t.openCard}
                  </Link>
                </div>
              </div>
            </article>
            );
          })}
        </div>

        <div className="hidden overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="w-56 px-5 py-4 text-left text-sm font-semibold text-slate-500">
                    {language === "pt"
                      ? "Parametro"
                      : language === "en"
                      ? "Parameter"
                      : language === "uk"
                      ? "Параметр"
                      : "Параметр"}
                  </th>
                  {comparedProperties.map((property) => {
                    const localizedProperty = getLocalizedPropertyContent(property, language);

                    return (
                    <th
                      key={property.id}
                      className="min-w-[260px] px-5 py-4 text-left align-top"
                    >
                      <div className="grid gap-3">
                        <img
                          src={getPropertyCoverImage(property)}
                          alt={localizedProperty.title}
                          className="h-40 w-full rounded-[20px] object-cover"
                        />
                        <div className="text-xl font-semibold leading-tight text-slate-950">
                          {localizedProperty.title}
                        </div>
                        <div className="text-sm text-slate-500">
                          {localizedProperty.city}, {property.district}, {property.country}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => removeCompare(property.id)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700"
                          >
                            {language === "pt"
                              ? "Remover da comparacao"
                              : language === "en"
                              ? "Remove from compare"
                              : language === "uk"
                              ? "Виключити з порівняння"
                              : "Исключить из сравнения"}
                          </button>
                          <Link
                            href={`/properties/${property.slug}`}
                            className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                          >
                            {t.openCard}
                          </Link>
                        </div>
                      </div>
                    </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {[
                  {
                    label: t.price,
                    render: (propertyId: string) => {
                      const property = comparedProperties.find(
                        (item) => item.id === propertyId
                      );

                      return property
                        ? formatPropertyPrice(property.priceAmount, property.mode, language)
                        : "—";
                    },
                  },
                  {
                    label: t.area,
                    render: (propertyId: string) => {
                      const property = comparedProperties.find(
                        (item) => item.id === propertyId
                      );
                      return property ? `${property.areaM2} m²` : "—";
                    },
                  },
                  {
                    label: t.bedrooms,
                    render: (propertyId: string) =>
                      String(
                        comparedProperties.find((property) => property.id === propertyId)
                          ?.bedrooms ?? "—"
                      ),
                  },
                  {
                    label: t.bathrooms,
                    render: (propertyId: string) =>
                      String(
                        comparedProperties.find((property) => property.id === propertyId)
                          ?.bathrooms ?? "—"
                      ),
                  },
                  {
                    label: t.location,
                    render: (propertyId: string) =>
                      comparedProperties.find((property) => property.id === propertyId)
                        ?.location.addressLabel ?? "—",
                  },
                  {
                    label: t.shortDescription,
                    render: (propertyId: string) => {
                      const property = comparedProperties.find(
                        (item) => item.id === propertyId
                      );

                      return property
                        ? getLocalizedPropertyContent(property, language).shortDescription
                        : "—";
                    },
                  },
                  {
                    label: t.features,
                    render: (propertyId: string) =>
                      comparedProperties
                        .find((property) => property.id === propertyId)
                        ?.features.map((feature) => featureTranslations[language][feature]).join(", ") ??
                      "—",
                  },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-slate-100">
                    <td className="px-5 py-4 align-top text-sm font-semibold text-slate-700">
                      {row.label}
                    </td>
                    {comparedProperties.map((property) => (
                      <td
                        key={`${row.label}-${property.id}`}
                        className="px-5 py-4 align-top text-sm leading-6 text-slate-600"
                      >
                        {row.render(property.id)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
