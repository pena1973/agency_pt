"use client";

import { useState } from "react";
import type { PropertyListing } from "@/lib/real-estate/types";

type AdminJsonEditorProps = {
  initialProperties: PropertyListing[];
};

function cloneProperty(property: PropertyListing): PropertyListing {
  return JSON.parse(JSON.stringify(property)) as PropertyListing;
}

export function AdminJsonEditor({ initialProperties }: AdminJsonEditorProps) {
  const [properties, setProperties] = useState<PropertyListing[]>(initialProperties);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialProperties[0]?.id ?? null
  );
  const [editorValue, setEditorValue] = useState(
    initialProperties[0] ? JSON.stringify(initialProperties[0], null, 2) : ""
  );
  const [statusMessage, setStatusMessage] = useState("");

  function selectProperty(property: PropertyListing) {
    setSelectedId(property.id);
    setEditorValue(JSON.stringify(cloneProperty(property), null, 2));
    setStatusMessage("");
  }

  async function saveProperty() {
    if (!selectedId) {
      return;
    }

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
      setEditorValue(JSON.stringify(parsed, null, 2));
      setStatusMessage("JSON сохранен.");
    } catch {
      setStatusMessage("JSON содержит ошибку.");
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fbff] px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-[1420px]">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Отдельное окно
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            JSON редактор объектов
          </h1>
        </div>

        {statusMessage ? (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {statusMessage}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
          <aside className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 max-h-[72vh] overflow-y-auto pr-1">
              {properties.map((property) => (
                <button
                  key={property.id}
                  type="button"
                  onClick={() => selectProperty(property)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    property.id === selectedId
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-950">
                    {property.title}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                    {property.id}
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-950">
                Полный JSON объекта
              </div>
              <button
                type="button"
                onClick={saveProperty}
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Сохранить JSON
              </button>
            </div>

            <textarea
              value={editorValue}
              onChange={(event) => setEditorValue(event.target.value)}
              className="min-h-[76vh] w-full rounded-[24px] border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 outline-none focus:border-emerald-500"
              spellCheck={false}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
