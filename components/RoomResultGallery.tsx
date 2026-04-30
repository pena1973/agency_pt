"use client";

import { useEffect, useState } from "react";
import type { GenerateRoomDesignResult } from "@/lib/room-ai/types";

type RoomResultGalleryProps = {
  result: GenerateRoomDesignResult | null;
  isGenerating?: boolean;
  originalPhotoSrc?: string | null;
};

type PreviewState = {
  src: string;
  alt: string;
  title: string;
  comparisonSrc?: string | null;
  comparisonAlt?: string;
  comparisonTitle?: string;
};

export function RoomResultGallery({
  result,
  isGenerating = false,
  originalPhotoSrc = null,
}: RoomResultGalleryProps) {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPreview(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const activeVariant =
    result?.variants[Math.min(activeIndex, Math.max(0, (result?.variants.length ?? 1) - 1))] ??
    null;

  return (
    <>
      <section className="relative grid gap-6">
        {!result && !isGenerating && (
          <section className="grid min-h-[560px] place-items-center rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-center">
            <div className="max-w-md">
              <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-slate-100 text-3xl">
                🛋️
              </div>

              <h2 className="mt-5 text-xl font-semibold text-slate-950">
                Здесь появятся варианты интерьера
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                После отправки формы система покажет 3 варианта. Их можно будет
                переключать по точкам сверху.
              </p>
            </div>
          </section>
        )}

        {result && activeVariant && (
          <>
            <div className="flex justify-center gap-2">
              {result.variants.map((variant, index) => (
                <button
                  key={variant.id}
                  type="button"
                  aria-label={`Показать вариант ${index + 1}`}
                  onClick={() => setActiveIndex(index)}
                  className={`h-3 w-3 rounded-full transition ${
                    index === activeIndex
                      ? "bg-slate-900"
                      : "bg-slate-300 hover:bg-slate-400"
                  }`}
                />
              ))}
            </div>

            <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-white px-6 py-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-emerald-700">
                      Вариант {activeIndex + 1}
                    </div>

                    <h3 className="mt-1 text-2xl font-semibold text-slate-950">
                      {activeVariant.title}
                    </h3>

                    <p className="mt-2 max-w-2xl text-sm leading-8 text-slate-500">
                      {activeVariant.description}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {activeVariant.palette.map((color) => (
                      <span
                        key={color}
                        className="size-7 rounded-full border border-slate-200"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6">
                <ImageBlock
                  title="Фото с мебелью"
                  src={activeVariant.photoImageUrl}
                  alt={`${activeVariant.title} photo`}
                  onOpen={() =>
                    setPreview({
                      src: activeVariant.photoImageUrl,
                      alt: `${activeVariant.title} photo`,
                      title: `${activeVariant.title} — фото с мебелью`,
                      comparisonSrc: originalPhotoSrc,
                      comparisonAlt: "Original room photo",
                      comparisonTitle: "Исходное фото",
                    })
                  }
                />
              </div>

              {((activeVariant.pros?.length ?? 0) > 0 ||
                (activeVariant.cons?.length ?? 0) > 0) && (
                <div className="border-t border-slate-100 px-6 py-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    {(activeVariant.pros?.length ?? 0) > 0 && (
                      <div>
                        <div className="text-sm font-semibold text-emerald-700">
                          Плюсы варианта
                        </div>
                        <ul className="mt-3 grid gap-2 text-sm text-slate-600">
                          {activeVariant.pros?.map((item) => (
                            <li
                              key={item}
                              className="rounded-2xl bg-emerald-50 px-4 py-3"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(activeVariant.cons?.length ?? 0) > 0 && (
                      <div>
                        <div className="text-sm font-semibold text-amber-700">
                          Компромиссы
                        </div>
                        <ul className="mt-3 grid gap-2 text-sm text-slate-600">
                          {activeVariant.cons?.map((item) => (
                            <li
                              key={item}
                              className="rounded-2xl bg-amber-50 px-4 py-3"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t border-slate-100 bg-slate-50 px-6 py-5">
                <div className="text-sm font-semibold text-slate-900">
                  Мебель в варианте
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {activeVariant.furniture.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <div className="text-sm font-semibold text-slate-900">
                        {item.label}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {item.widthM} × {item.depthM} м · поворот {item.rotationDeg}°
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </>
        )}

        {isGenerating && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[28px] bg-white/75 backdrop-blur-sm">
            <div className="rounded-3xl border border-slate-200 bg-white px-8 py-7 shadow-xl">
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-emerald-200 border-t-emerald-600" />
                <div className="mt-4 text-lg font-semibold text-slate-900">
                  Генерируем 3 варианта...
                </div>
                <div className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Анализируем помещение и строим сразу три интерьерных решения.
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {preview && (
        <ImagePreviewModal preview={preview} onClose={() => setPreview(null)} />
      )}
    </>
  );
}

function ImageBlock({
  title,
  src,
  alt,
  onOpen,
}: {
  title: string;
  src: string;
  alt: string;
  onOpen: () => void;
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-slate-800">{title}</div>

      <button
        type="button"
        onClick={onOpen}
        className="group block w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 text-left transition hover:shadow-md"
      >
        <div className="relative">
          <img src={src} alt={alt} className="aspect-[4/3] w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/60 to-transparent px-4 py-3 text-sm font-medium text-white opacity-0 transition group-hover:opacity-100">
            Нажми, чтобы увеличить
          </div>
        </div>
      </button>
    </div>
  );
}

function ImagePreviewModal({
  preview,
  onClose,
}: {
  preview: PreviewState;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-7xl rounded-[28px] bg-white p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="text-sm font-semibold text-slate-900">{preview.title}</div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            Закрыть
          </button>
        </div>

        {preview.comparisonSrc ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <ImagePreviewPanel
              title={preview.comparisonTitle ?? "Исходное фото"}
              src={preview.comparisonSrc}
              alt={preview.comparisonAlt ?? "Original photo"}
            />
            <ImagePreviewPanel
              title="Сгенерированное фото"
              src={preview.src}
              alt={preview.alt}
            />
          </div>
        ) : (
          <ImagePreviewPanel title={preview.title} src={preview.src} alt={preview.alt} />
        )}
      </div>
    </div>
  );
}

function ImagePreviewPanel({
  title,
  src,
  alt,
}: {
  title: string;
  src: string;
  alt: string;
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-slate-800">{title}</div>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
        <img src={src} alt={alt} className="max-h-[75vh] w-full object-contain" />
      </div>
    </div>
  );
}
