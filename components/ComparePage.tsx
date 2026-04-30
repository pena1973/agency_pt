"use client";

import Link from "next/link";
import { getFeatureLabel } from "@/lib/real-estate/data";
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

  if (comparedProperties.length === 0) {
    return (
      <main className="min-h-screen bg-[#f8fbff] px-8 py-10 text-slate-950">
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
    <main className="min-h-screen bg-[#f8fbff] px-8 py-10 text-slate-950">
      <div className="mx-auto max-w-[1380px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Сравнение объектов
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Таблица сравнения
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={clearCompare}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              Очистить список
            </button>
            <Link
              href="/"
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Вернуться в каталог
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
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
                          src={property.imageGallery[0] ?? property.imageUrl}
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
