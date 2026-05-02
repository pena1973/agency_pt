"use client";

import { useEffect, useRef, useState } from "react";
import { RoomDesignForm } from "@/components/RoomDesignForm";
import { RoomResultGallery } from "@/components/RoomResultGallery";
import type { GenerateRoomDesignResult } from "@/lib/room-ai/types";

export function GeneratePage() {
  const [result, setResult] = useState<GenerateRoomDesignResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [originalPhotoSrc, setOriginalPhotoSrc] = useState<string | null>(null);
  const originalPhotoUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (originalPhotoUrlRef.current) {
        URL.revokeObjectURL(originalPhotoUrlRef.current);
      }
    };
  }, []);

  return (
    <main className="site-page-background min-h-screen text-slate-950">
      <section className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
              Room AI prototype
            </div>

            <h1 className="mt-5 max-w-4xl text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Генератор расстановки мебели по фото комнаты
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Загрузите фото помещения, укажите назначение комнаты и размеры.
              Система подготовит 3 варианта расстановки с визуализацией мебели и
              списком предметов для каждого решения.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 shadow-sm md:w-80">
            <div className="font-semibold text-slate-900">Что будет на выходе</div>
            <div className="mt-3 grid gap-2">
              <div>3 фото с мебелью</div>
              <div>сравнение с исходной комнатой</div>
              <div>описание и список мебели</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-8 xl:grid-cols-[430px_1fr]">
        <div className="xl:sticky xl:top-6 xl:self-start">
          <RoomDesignForm
            onResult={setResult}
            onLoadingChange={setIsGenerating}
            onPhotosChange={(photos) => {
              if (originalPhotoUrlRef.current) {
                URL.revokeObjectURL(originalPhotoUrlRef.current);
                originalPhotoUrlRef.current = null;
              }

              const firstPhoto = photos[0];

              if (!firstPhoto) {
                setOriginalPhotoSrc(null);
                return;
              }

              const nextUrl = URL.createObjectURL(firstPhoto);
              originalPhotoUrlRef.current = nextUrl;
              setOriginalPhotoSrc(nextUrl);
            }}
          />
        </div>

        <RoomResultGallery
          result={result}
          isGenerating={isGenerating}
          originalPhotoSrc={originalPhotoSrc}
        />
      </section>
    </main>
  );
}
