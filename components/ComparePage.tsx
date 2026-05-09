"use client";

import Link from "next/link";
import { getFeatureLabel } from "@/lib/real-estate/data";
import { getPropertyCoverImage } from "@/lib/real-estate/property-cover";
import type { PropertyListing } from "@/lib/real-estate/types";
import { useCompareList } from "@/lib/real-estate/useCompareList";

type ComparePageProps = {
  propertiesData: PropertyListing[];
};

export function ComparePage({ propertiesData }: ComparePageProps) {
  const { compareIds, removeCompare, clearCompare } = useCompareList();
  const comparedProperties = propertiesData.filter((property) =>
    compareIds.includes(property.id)
  );
  const comparisonRows = [
    {
      label: "Цена",
      render: (property: PropertyListing) => property.priceLabel,
    },
    {
      label: "Площадь",
      render: (property: PropertyListing) => `${property.areaM2} м²`,
    },
    {
      label: "Спальни",
      render: (property: PropertyListing) => String(property.bedrooms ?? "—"),
    },
    {
      label: "Ванные",
      render: (property: PropertyListing) => String(property.bathrooms ?? "—"),
    },
    {
      label: "Локация",
      render: (property: PropertyListing) => property.location.addressLabel,
    },
    {
      label: "Краткое описание",
      render: (property: PropertyListing) => property.shortDescription,
    },
    {
      label: "Характеристики",
      render: (property: PropertyListing) =>
        property.features.map((feature) => getFeatureLabel(feature)).join(", ") || "—",
    },
  ];

  if (comparedProperties.length === 0) {
    return (
      <main className="site-page-background min-h-screen px-8 py-10 text-slate-950">
        <div className="mx-auto max-w-5xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Сравнение объектов
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Список сравнения пока пуст
              </h1>
            </div>

            <Link
              href="/"
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Вернуться в каталог
            </Link>
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
              Сравнение объектов
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
              Таблица сравнения
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={clearCompare}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 sm:px-4 sm:py-3"
            >
              Очистить список
            </button>
            <Link
              href="/"
              className="rounded-2xl bg-slate-950 px-3 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-800 sm:px-5 sm:py-3"
            >
              Вернуться в каталог
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:hidden">
          {comparedProperties.map((property) => (
            <article
              key={property.id}
              className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm"
            >
              <img
                src={getPropertyCoverImage(property)}
                alt={property.title}
                className="h-48 w-full object-cover"
              />
              <div className="grid gap-4 p-4">
                <div>
                  <div className="text-lg font-semibold leading-tight text-slate-950">
                    {property.title}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {property.city}, {property.district}, {property.country}
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
                    Исключить
                  </button>
                  <Link
                    href={`/properties/${property.slug}`}
                    className="rounded-xl bg-slate-950 px-3 py-2.5 text-center text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    Карточка
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="w-56 px-5 py-4 text-left text-sm font-semibold text-slate-500">
                    Параметр
                  </th>
                  {comparedProperties.map((property) => (
                    <th
                      key={property.id}
                      className="min-w-[260px] px-5 py-4 text-left align-top"
                    >
                      <div className="grid gap-3">
                        <img
                          src={getPropertyCoverImage(property)}
                          alt={property.title}
                          className="h-40 w-full rounded-[20px] object-cover"
                        />
                        <div className="text-xl font-semibold leading-tight text-slate-950">
                          {property.title}
                        </div>
                        <div className="text-sm text-slate-500">
                          {property.city}, {property.district}, {property.country}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => removeCompare(property.id)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700"
                          >
                            Исключить из сравнения
                          </button>
                          <Link
                            href={`/properties/${property.slug}`}
                            className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                          >
                            Карточка объекта
                          </Link>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {[
                  {
                    label: "Цена",
                    render: (propertyId: string) =>
                      comparedProperties.find((property) => property.id === propertyId)
                        ?.priceLabel ?? "—",
                  },
                  {
                    label: "Площадь",
                    render: (propertyId: string) => {
                      const property = comparedProperties.find(
                        (item) => item.id === propertyId
                      );
                      return property ? `${property.areaM2} м²` : "—";
                    },
                  },
                  {
                    label: "Спальни",
                    render: (propertyId: string) =>
                      String(
                        comparedProperties.find((property) => property.id === propertyId)
                          ?.bedrooms ?? "—"
                      ),
                  },
                  {
                    label: "Ванные",
                    render: (propertyId: string) =>
                      String(
                        comparedProperties.find((property) => property.id === propertyId)
                          ?.bathrooms ?? "—"
                      ),
                  },
                  {
                    label: "Локация",
                    render: (propertyId: string) =>
                      comparedProperties.find((property) => property.id === propertyId)
                        ?.location.addressLabel ?? "—",
                  },
                  {
                    label: "Краткое описание",
                    render: (propertyId: string) =>
                      comparedProperties.find((property) => property.id === propertyId)
                        ?.shortDescription ?? "—",
                  },
                  {
                    label: "Характеристики",
                    render: (propertyId: string) =>
                      comparedProperties
                        .find((property) => property.id === propertyId)
                        ?.features.map((feature) => getFeatureLabel(feature)).join(", ") ??
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
