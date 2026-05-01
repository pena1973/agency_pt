"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type MessengerOption = "whatsapp" | "telegram" | "viber" | "signal";

type ContactFormState = {
  phone: string;
  searchType: string;
  location: string;
  areaAndTypology: string;
  mustHave: string;
  balcony: boolean;
  terrace: boolean;
  garageParking: boolean;
  closedGarage: boolean;
  nearMetroTransport: boolean;
  nearSupermarket: boolean;
  messengers: MessengerOption[];
  message: string;
};

type SubmitState = "idle" | "error" | "success";

const messengerLabels: Array<{ value: MessengerOption; label: string }> = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" },
  { value: "viber", label: "Viber" },
  { value: "signal", label: "Signal" },
];

const preferenceOptions = [
  { key: "balcony", label: "Балкон" },
  { key: "terrace", label: "Терраса" },
  { key: "garageParking", label: "Стоянка в гараже" },
  { key: "closedGarage", label: "Закрытый гараж" },
  { key: "nearMetroTransport", label: "Близость к метро, транспорту" },
  { key: "nearSupermarket", label: "Близость к супермаркету" },
] as const;

const initialFormState: ContactFormState = {
  phone: "",
  searchType: "",
  location: "",
  areaAndTypology: "",
  mustHave: "",
  balcony: false,
  terrace: false,
  garageParking: false,
  closedGarage: false,
  nearMetroTransport: false,
  nearSupermarket: false,
  messengers: [],
  message: "",
};

export function ContactRealtorPage() {
  const [formState, setFormState] = useState<ContactFormState>(initialFormState);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  const isPhoneValid = formState.phone.trim().length > 0;
  const canSubmit = isPhoneValid;

  function toggleMessenger(messenger: MessengerOption) {
    setFormState((currentState) => {
      const nextMessengers = currentState.messengers.includes(messenger)
        ? currentState.messengers.filter((item) => item !== messenger)
        : [...currentState.messengers, messenger];

      return {
        ...currentState,
        messengers: nextMessengers,
      };
    });
    setSubmitState("idle");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      setSubmitState("error");
      return;
    }

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "catalog_request",
          phone: formState.phone,
          messengers: formState.messengers,
          searchType: formState.searchType,
          location: formState.location,
          areaAndTypology: formState.areaAndTypology,
          mustHave: formState.mustHave,
          balcony: formState.balcony,
          terrace: formState.terrace,
          garageParking: formState.garageParking,
          closedGarage: formState.closedGarage,
          nearMetroTransport: formState.nearMetroTransport,
          nearSupermarket: formState.nearSupermarket,
          message: formState.message,
        }),
      });

      if (!response.ok) {
        setSubmitState("error");
        return;
      }

      setSubmitState("success");
      setFormState(initialFormState);
    } catch {
      setSubmitState("error");
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fbff] text-slate-950">
      <section className="mx-auto max-w-[1380px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-emerald-900 text-sm font-semibold text-white shadow-sm">
                  И
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
                    Агентство недвижимости
                  </div>
                  <div className="text-[2rem] font-semibold leading-none tracking-tight text-slate-950">
                    ИРИНА
                  </div>
                </div>
              </Link>

              <Link
                href="/"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
              >
                В каталог
              </Link>
            </div>

            <div className="mt-10">
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Написать риэлтору
              </h1>
              <div className="mt-6 space-y-4 text-base leading-8 text-slate-600">
                <p>Приветствуем вас на сайте по подбору недвижимости.</p>
                <p>Мы обязательно найдем для вас место жительства вашей мечты.</p>
                <p>
                  Оставьте ваш телефон и ваши пожелания. Мы свяжемся с вами в
                  ближайшее время.
                </p>
                <p>
                  Вы также можете позвонить нам или написать по WhatsApp или
                  Telegram.
                </p>
                <div className="rounded-[24px] border border-slate-200 bg-[#fbfdff] px-5 py-4 text-sm leading-7 text-slate-600">
                  <div className="font-semibold text-slate-900">Контакты:</div>
                  <div className="mt-2">Телефон: +351 912 345 678</div>
                  <div>WhatsApp: +351 912 345 678</div>
                  <div>Telegram: @irina_realestate</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <form className="grid gap-5" onSubmit={handleSubmit}>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Телефон{" "}
                    <span className="text-[0.7rem] normal-case tracking-normal">
                      (обязательно)
                    </span>
                  </span>
                  <input
                    type="tel"
                    required
                    value={formState.phone}
                    onChange={(event) => {
                      setFormState((currentState) => ({
                        ...currentState,
                        phone: event.target.value,
                      }));
                      setSubmitState("idle");
                    }}
                    placeholder="+351 ..."
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Что необходимо
                  </span>
                  <select
                    value={formState.searchType}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        searchType: event.target.value,
                      }))
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="">Не указано</option>
                    <option value="Дом">Дом</option>
                    <option value="Квартира">Квартира</option>
                    <option value="Земля">Земля</option>
                  </select>
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  По каким мессенджерам можно связаться
                </span>
                <div className="flex flex-wrap gap-3 rounded-[24px] border border-slate-200 bg-[#fbfdff] px-4 py-4">
                  {messengerLabels.map((messenger) => {
                    const isChecked = formState.messengers.includes(messenger.value);

                    return (
                      <label
                        key={messenger.value}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
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
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Локация
                  </span>
                  <input
                    type="text"
                    value={formState.location}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        location: event.target.value,
                      }))
                    }
                    placeholder="Лиссабон, Кашкайш, Порту..."
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Площадь и типология
                  </span>
                  <input
                    type="text"
                    value={formState.areaAndTypology}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        areaAndTypology: event.target.value,
                      }))
                    }
                    placeholder="Например, 90-120 м², T2-T3"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Что принципиально
                </span>
                <input
                  type="text"
                  value={formState.mustHave}
                  onChange={(event) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      mustHave: event.target.value,
                    }))
                  }
                  placeholder="Например, тихая улица, новый дом, рядом школа"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-[#fbfdff] px-4 py-4 sm:grid-cols-2">
                {preferenceOptions.map((option) => (
                  <label
                    key={option.key}
                    className="inline-flex items-center gap-3 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={formState[option.key]}
                      onChange={(event) =>
                        setFormState((currentState) => ({
                          ...currentState,
                          [option.key]: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                    />
                    {option.label}
                  </label>
                ))}
              </div>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Произвольное сообщение
                </span>
                <textarea
                  rows={5}
                  value={formState.message}
                  onChange={(event) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      message: event.target.value,
                    }))
                  }
                  placeholder="Можно коротко описать бюджет, сроки и дополнительные пожелания"
                  className="resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-[#fbfdff] px-5 py-4 text-sm leading-7 text-slate-600">
                {submitState === "error" ? (
                  <p>Нужно указать телефон.</p>
                ) : submitState === "success" ? (
                  <p>Черновик письма подготовлен. Можно отправить его риэлтору.</p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Отправить запрос
                </button>
                <Link
                  href="/"
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                >
                  Вернуться в каталог
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
