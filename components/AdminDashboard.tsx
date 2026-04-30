"use client";

import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";
import type { PropertyListing } from "@/lib/real-estate/types";

type AdminDashboardProps = {
  initialProperties: PropertyListing[];
};

function createPropertyTemplate(): PropertyListing {
  const now = new Date().toISOString().slice(0, 10);

  return {
    id: `irina-${Date.now()}`,
    slug: `new-property-${Date.now()}`,
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
    imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
    imageGallery: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
    ],
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

export function AdminDashboard({ initialProperties }: AdminDashboardProps) {
  const [properties, setProperties] = useState<PropertyListing[]>(initialProperties);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialProperties[0]?.id ?? null
  );
  const [editorValue, setEditorValue] = useState<string>(
    initialProperties[0] ? JSON.stringify(initialProperties[0], null, 2) : ""
  );
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === selectedId) ?? null,
    [properties, selectedId]
  );

  function selectProperty(property: PropertyListing) {
    setSelectedId(property.id);
    setEditorValue(JSON.stringify(property, null, 2));
    setStatusMessage("");
  }

  async function saveSelectedProperty() {
    if (!selectedId) {
      return;
    }

    setIsSaving(true);
    setStatusMessage("");

    try {
      const parsed = JSON.parse(editorValue) as PropertyListing;
      const response = await fetch(`/api/admin/properties/${selectedId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed),
      });

      const payload = (await response.json()) as {
        error?: string;
        properties?: PropertyListing[];
      };

      if (!response.ok || !payload.properties) {
        setStatusMessage(payload.error ?? "Не удалось сохранить объект.");
        return;
      }

      setProperties(payload.properties);
      setSelectedId(parsed.id);
      setEditorValue(JSON.stringify(parsed, null, 2));
      setStatusMessage("Объект сохранен.");
    } catch {
      setStatusMessage("JSON содержит ошибку и не может быть сохранен.");
    } finally {
      setIsSaving(false);
    }
  }

  async function createProperty() {
    const template = createPropertyTemplate();
    setIsSaving(true);
    setStatusMessage("");

    const response = await fetch("/api/admin/properties", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(template),
    });

    const payload = (await response.json()) as {
      error?: string;
      properties?: PropertyListing[];
    };

    if (!response.ok || !payload.properties) {
      setStatusMessage(payload.error ?? "Не удалось создать объект.");
      setIsSaving(false);
      return;
    }

    setProperties(payload.properties);
    setSelectedId(template.id);
    setEditorValue(JSON.stringify(template, null, 2));
    setStatusMessage("Новый объект создан.");
    setIsSaving(false);
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
    setEditorValue(nextSelected ? JSON.stringify(nextSelected, null, 2) : "");
    setStatusMessage("Объект удален.");
    setIsSaving(false);
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const fileContents = await file.text();

    try {
      const parsed = JSON.parse(fileContents) as PropertyListing[];
      const response = await fetch("/api/admin/properties", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed),
      });

      const payload = (await response.json()) as {
        error?: string;
        properties?: PropertyListing[];
      };

      if (!response.ok || !payload.properties) {
        setStatusMessage(payload.error ?? "Не удалось импортировать файл.");
        return;
      }

      setProperties(payload.properties);
      setSelectedId(payload.properties[0]?.id ?? null);
      setEditorValue(
        payload.properties[0] ? JSON.stringify(payload.properties[0], null, 2) : ""
      );
      setStatusMessage("JSON импортирован.");
    } catch {
      setStatusMessage("Файл не является валидным JSON.");
    } finally {
      event.target.value = "";
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(properties, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "properties.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#f8fbff] px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-[1480px]">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Скрытая админка
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Управление каталогом недвижимости
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Эта страница не добавлена в интерфейс сайта и предназначена для загрузки,
            редактирования и удаления объектов.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={createProperty}
            disabled={isSaving}
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            Новый объект
          </button>
          <label className="inline-flex cursor-pointer items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800">
            Импорт JSON
            <input type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
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
            onClick={saveSelectedProperty}
            disabled={isSaving || !selectedId}
            className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-60"
          >
            Сохранить объект
          </button>
          <button
            type="button"
            onClick={deleteSelectedProperty}
            disabled={isSaving || !selectedId}
            className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50 disabled:opacity-60"
          >
            Удалить объект
          </button>
        </div>

        {statusMessage ? (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {statusMessage}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <aside className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-slate-950">
              Объекты в каталоге: {properties.length}
            </div>
            <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1">
              {properties.map((property) => {
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
                    <div className="text-sm font-semibold text-slate-950">
                      {property.title}
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
            </div>
          </aside>

          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-950">
                  JSON редактор объекта
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Можно вставлять готовый JSON объекта целиком, включая транспорт,
                  фотографии, характеристики и налоговый профиль.
                </div>
              </div>
              {selectedId ? (
                <a
                  href={`/properties/${selectedProperty?.slug ?? ""}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                >
                  Открыть объект
                </a>
              ) : null}
            </div>

            <textarea
              value={editorValue}
              onChange={(event) => setEditorValue(event.target.value)}
              className="min-h-[70vh] w-full rounded-[24px] border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 outline-none focus:border-emerald-500"
              spellCheck={false}
              placeholder="Выбери объект слева или создай новый."
            />
          </section>
        </div>
      </div>
    </main>
  );
}
