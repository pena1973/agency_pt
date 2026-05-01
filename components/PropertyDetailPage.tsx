"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { getFeatureLabel } from "@/lib/real-estate/data";
import type {
  EnergyRating,
  HeatingType,
  PropertyCondition,
  PropertyListing,
  PropertyType,
  TransportMode,
} from "@/lib/real-estate/types";
import { useCompareList } from "@/lib/real-estate/useCompareList";

type PropertyDetailPageProps = {
  property: PropertyListing;
};

const propertyTypeLabels: Record<PropertyType, string> = {
  apartment: "Квартира",
  duplex: "Дуплекс",
  land: "Участок",
  loft: "Лофт",
  penthouse: "Пентхаус",
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
  central: "Центральное отопление",
  electric: "Электрическое отопление",
  heat_pump: "Тепловой насос",
  none: "Без отопления",
  underfloor: "Теплый пол",
};

const transportModeLabels: Record<TransportMode, string> = {
  bus: "Автобус",
  ferry: "Паром",
  metro: "Метро",
  train: "Поезд",
  tram: "Трамвай",
};

type MessengerOption = "whatsapp" | "telegram" | "viber" | "signal";

const messengerLabels: Array<{ value: MessengerOption; label: string }> = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" },
  { value: "viber", label: "Viber" },
  { value: "signal", label: "Signal" },
];

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
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showTaxCalculator, setShowTaxCalculator] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactMessengers, setContactMessengers] = useState<MessengerOption[]>([]);
  const [contactMessage, setContactMessage] = useState(
    `Здравствуйте! Меня интересует объект ${property.id} — ${property.title}.`
  );
  const [contactSubmitState, setContactSubmitState] = useState<
    "idle" | "error" | "success"
  >("idle");
  const { compareIds, toggleCompare } = useCompareList();
  const isCompared = compareIds.includes(property.id);

  const propertyUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `/properties/${property.slug}`;
    }

    return `${window.location.origin}/properties/${property.slug}`;
  }, [property.slug]);

  const taxEstimate = useMemo(() => {
    if (property.mode !== "sale" || !property.taxProfile) {
      return null;
    }

    const transferTax = property.priceAmount * property.taxProfile.propertyTransferTaxRate;
    const stampDuty = property.priceAmount * property.taxProfile.stampDutyRate;
    const notaryCosts = property.priceAmount * property.taxProfile.notaryEstimateRate;

    return {
      transferTax,
      stampDuty,
      notaryCosts,
      total: transferTax + stampDuty + notaryCosts,
    };
  }, [property]);

  async function handleCopyLink() {
    await navigator.clipboard.writeText(propertyUrl);
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1800);
  }

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({
        title: property.title,
        text: `${property.title} — ${property.priceLabel}`,
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
          propertyTitle: property.title,
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
      setContactMessage(
        `Здравствуйте! Меня интересует объект ${property.id} — ${property.title}.`
      );
    } catch {
      setContactSubmitState("error");
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f4eb_0%,#f6f8fb_40%,#ffffff_100%)] px-5 py-6 text-slate-950 md:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
          >
            Вернуться в каталог
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => toggleCompare(property.id)}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                isCompared
                  ? "border border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-800"
              }`}
            >
              <CompareIcon />
              {isCompared ? "В сравнении" : "В сравнение"}
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
            >
              <CopyIcon />
              {copyState === "copied" ? "Ссылка скопирована" : "Копировать ссылку"}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
            >
              <ShareIcon />
              Поделиться
            </button>
            <a
              href={property.location.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
            >
              Открыть на карте
            </a>
            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              ID: {property.id}
            </div>
          </div>
        </div>

        <article className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="relative">
            <img
              src={property.imageGallery[activeImageIndex] ?? property.imageUrl}
              alt={`${property.title} — фото ${activeImageIndex + 1}`}
              className="h-[360px] w-full object-cover md:h-[400px]"
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
                  className={`overflow-hidden rounded-2xl border ${
                    index === activeImageIndex
                      ? "border-emerald-500 ring-2 ring-emerald-100"
                      : "border-slate-200"
                  }`}
                >
                  <img
                    src={image}
                    alt={`${property.title} — миниатюра ${index + 1}`}
                    className="h-16 w-24 object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid items-start gap-6 p-5 md:p-6 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="grid gap-5 self-start">
              <div className="grid gap-2">
                <div className="inline-flex w-fit rounded-full bg-[#eef6f4] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900">
                  {property.mode === "sale" ? "Продажа" : "Аренда"}
                </div>

                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-[2rem]">
                  {property.title}
                </h1>

                <p className="text-sm text-slate-500 md:text-base">
                  {property.city}, {property.district}, {property.country}
                </p>
              </div>

              <p className="max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
                {property.fullDescription}
              </p>

              <div className="flex flex-wrap items-start content-start gap-2 self-start">
                {property.features.map((feature) => (
                  <span
                    key={feature}
                    className="inline-flex w-fit shrink-0 self-start whitespace-nowrap rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium leading-none text-slate-700"
                  >
                    {getFeatureLabel(feature)}
                  </span>
                ))}
              </div>

              <section className="grid gap-3 rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                <h2 className="text-lg font-semibold text-slate-950">Характеристики объекта</h2>
                <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                  <div>Тип недвижимости: {propertyTypeLabels[property.details.propertyType]}</div>
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

            </div>

            <aside className="grid gap-3 self-start rounded-[28px] bg-slate-50 p-4">
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Стоимость
                </div>
                <div className="mt-1 text-[2rem] font-semibold text-slate-950">
                  {property.priceLabel}
                </div>
              </div>

              <div className="grid gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
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

              <section className="grid gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">Транспортная доступность</h2>
                <div className="grid gap-2">
                  {property.transportAccess.map((route) => (
                    <div
                      key={`${route.mode}-${route.route}-${route.stopName}`}
                      className="rounded-2xl bg-slate-50 px-4 py-2.5 text-sm text-slate-700"
                    >
                      <div className="font-semibold text-slate-950">
                        {transportModeLabels[route.mode]} {route.route}
                      </div>
                      <div className="mt-1">
                        Остановка: {route.stopName} · пешком {route.walkMinutes} мин
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
                        Налоги и оформление
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        Быстрая оценка расходов при покупке
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowTaxCalculator((current) => !current)}
                      className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Налоговый калькулятор
                    </button>
                  </div>

                  {showTaxCalculator ? (
                    <div className="mt-3 grid gap-2 text-sm text-slate-700">
                      <div className="rounded-2xl bg-slate-50 px-4 py-2.5">
                        IMT: {formatMoney(taxEstimate.transferTax)}
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-2.5">
                        Гербовый сбор: {formatMoney(taxEstimate.stampDuty)}
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-2.5">
                        Нотариус и регистрация: {formatMoney(taxEstimate.notaryCosts)}
                      </div>
                      <div className="rounded-2xl bg-[#eef6f4] px-4 py-2.5 font-semibold text-emerald-900">
                        Итого ориентировочно: {formatMoney(taxEstimate.total)}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Связь с риэлтором
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowContactForm((current) => !current)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                  >
                    Написать риэлтору
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
                      placeholder="Ваше имя"
                      className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
                    />
                    <div className="grid gap-2">
                      <input
                        type="tel"
                        required
                        value={contactPhone}
                        onChange={(event) => setContactPhone(event.target.value)}
                        placeholder="Телефон (обязательно)"
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
                        Укажи телефон, чтобы отправить обращение.
                      </div>
                    ) : contactSubmitState === "success" ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        Обращение отправлено и сохранено в админке.
                      </div>
                    ) : null}
                    <button
                      type="submit"
                      className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Отправить обращение
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
