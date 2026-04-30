"use client";

import { useEffect, useMemo, useState } from "react";
import type { RoomAiErrorCode } from "@/lib/room-ai/errors";
import type { GenerateRoomDesignResult, RoomType } from "@/lib/room-ai/types";

type RoomDesignFormProps = {
  onResult: (result: GenerateRoomDesignResult) => void;
  onLoadingChange?: (loading: boolean) => void;
  onPhotosChange?: (photos: File[]) => void;
};

type GenerateRoomDesignErrorResponse = {
  error?: string;
  errorCode?: RoomAiErrorCode;
};

const roomTypes: Array<{ value: RoomType; label: string; hint: string }> = [
  {
    value: "kitchen",
    label: "Кухня",
    hint: "Обеденная зона, хранение, техника",
  },
  {
    value: "bedroom",
    label: "Спальня",
    hint: "Кровать, хранение, рабочее место",
  },
  {
    value: "kids_room",
    label: "Детская",
    hint: "Сон, учёба, игра, хранение",
  },
  {
    value: "office",
    label: "Кабинет",
    hint: "Рабочее место и хранение",
  },
  {
    value: "living_room",
    label: "Гостиная",
    hint: "Диван, ТВ, зона отдыха",
  },
];

const palettes = [
  { value: "light", label: "Светлая" },
  { value: "warm", label: "Тёплая" },
  { value: "dark", label: "Тёмная" },
  { value: "pastel", label: "Пастельная" },
  { value: "scandinavian", label: "Скандинавская" },
];

export function RoomDesignForm({
  onResult,
  onLoadingChange,
  onPhotosChange,
}: RoomDesignFormProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [roomType, setRoomType] = useState<RoomType>("bedroom");
  const [widthM, setWidthM] = useState("");
  const [lengthM, setLengthM] = useState("");
  const [heightM, setHeightM] = useState("");
  const [peopleCount, setPeopleCount] = useState("1");
  const [palette, setPalette] = useState("light");
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [errorCode, setErrorCode] = useState<RoomAiErrorCode | null>(null);

  const selectedRoom = useMemo(
    () => roomTypes.find((item) => item.value === roomType),
    [roomType]
  );

  const photoPreviewUrls = useMemo(
    () =>
      photos.map((photo) => ({
        name: photo.name,
        url: URL.createObjectURL(photo),
      })),
    [photos]
  );

  useEffect(() => {
    return () => {
      for (const preview of photoPreviewUrls) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [photoPreviewUrls]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorText("");
    setErrorCode(null);

    if (photos.length === 0) {
      setErrorText("Загрузи хотя бы одну фотографию помещения.");
      return;
    }

    const formData = new FormData();

    for (const photo of photos) {
      formData.append("photos", photo);
    }

    formData.append("roomType", roomType);
    formData.append("widthM", widthM);
    formData.append("lengthM", lengthM);
    formData.append("heightM", heightM);
    formData.append("peopleCount", peopleCount);
    formData.append("palette", palette);

    setIsLoading(true);
    onLoadingChange?.(true);

    try {
      const response = await fetch("/api/room-ai/generate", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as
        | GenerateRoomDesignResult
        | GenerateRoomDesignErrorResponse;

      if (!response.ok) {
        const errorResponse = data as GenerateRoomDesignErrorResponse;
        setErrorCode(errorResponse.errorCode ?? null);
        setErrorText(errorResponse.error ?? "Ошибка генерации.");
        return;
      }

      onResult(data as GenerateRoomDesignResult);
    } catch (error) {
      setErrorText(
        error instanceof Error ? error.message : "Неизвестная ошибка."
      );
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
        <h2 className="text-xl font-semibold text-slate-950">
          Параметры комнаты
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Для прототипа фото уже анализируется ИИ, а варианты расстановки
          строятся на основе этого анализа.
        </p>
      </div>

      <div className="grid gap-6 p-6">
        {photoPreviewUrls.length > 0 && (
          <section className="grid gap-2">
            <div className="text-sm font-semibold text-slate-800">
              Загруженные фотографии
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1">
              {photoPreviewUrls.map((preview) => (
                <div
                  key={`${preview.name}-${preview.url}`}
                  className="w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                  title={preview.name}
                >
                  <img
                    src={preview.url}
                    alt={preview.name}
                    className="aspect-square w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-800">
            Фотографии помещения
          </span>

          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                const nextPhotos = Array.from(event.target.files ?? []);
                setPhotos(nextPhotos);
                onPhotosChange?.(nextPhotos);
              }}
              className="w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            />

            <div className="mt-3 text-xs text-slate-500">
              Можно загрузить одну или несколько фотографий комнаты.
            </div>

            {photos.length > 0 && (
              <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
                Загружено файлов:{" "}
                <span className="font-semibold">{photos.length}</span>
              </div>
            )}
          </div>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-800">
            Назначение комнаты
          </span>

          <select
            value={roomType}
            onChange={(event) => setRoomType(event.target.value as RoomType)}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            {roomTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          {selectedRoom && (
            <span className="text-xs text-slate-500">{selectedRoom.hint}</span>
          )}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-800">
              Ширина, м
            </span>
            <input
              value={widthM}
              onChange={(event) => setWidthM(event.target.value)}
              placeholder="Например 3"
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-800">
              Длина, м
            </span>
            <input
              value={lengthM}
              onChange={(event) => setLengthM(event.target.value)}
              placeholder="Например 3.5"
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-800">
              Высота, м
            </span>
            <input
              value={heightM}
              onChange={(event) => setHeightM(event.target.value)}
              placeholder="Например 2.6"
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-800">
              Количество людей
            </span>
            <input
              value={peopleCount}
              onChange={(event) => setPeopleCount(event.target.value)}
              placeholder="1"
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-800">
            Цветовая гамма мебели
          </span>

          <select
            value={palette}
            onChange={(event) => setPalette(event.target.value)}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            {palettes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        {errorText && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm ${
              errorCode
                ? "border border-amber-300 bg-amber-50 text-amber-950"
                : "border border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {errorCode && (
              <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                Лимит OpenAI
              </div>
            )}
            {errorText}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="inline-flex items-center gap-3">
            {isLoading && (
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {isLoading ? "Генерируем варианты..." : "Сгенерировать 3 варианта"}
          </span>
        </button>
      </div>
    </form>
  );
}
