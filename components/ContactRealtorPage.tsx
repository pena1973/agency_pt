"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { siteTranslations } from "@/lib/i18n/site";
import { useSiteLocale } from "@/lib/i18n/use-site-locale";
import { AgencyLogo } from "./AgencyLogo";
import { LanguageSwitcher } from "./LanguageSwitcher";

type MessengerOption = "whatsapp" | "telegram" | "viber" | "signal";

type ContactFormState = {
  name: string;
  phone: string;
  searchType: string;
  location: string;
  areaAndTypology: string;
  mustHave: string;
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

const initialFormState: ContactFormState = {
  name: "",
  phone: "",
  searchType: "",
  location: "",
  areaAndTypology: "",
  mustHave: "",
  messengers: [],
  message: "",
};

export function ContactRealtorPage() {
  const [language, setSiteLanguage] = useSiteLocale();
  const [formState, setFormState] = useState<ContactFormState>(initialFormState);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const t = siteTranslations[language];
  const c = {
    pt: {
      intro: [
        "Bem-vindo ao servico de selecao de imoveis.",
        "Vamos encontrar para si uma casa que corresponda ao seu objetivo.",
        "Deixe o seu telefone e preferencias. Entraremos em contacto consigo em breve.",
        "Tambem pode telefonar-nos ou escrever pelo WhatsApp ou Telegram.",
      ],
      contacts: "Contactos",
      namePlaceholder: "Como devemos tratar voce",
      whatNeeded: "O que procura",
      unspecified: "Nao indicado",
      house: "Casa",
      apartment: "Apartamento",
      land: "Terreno",
      messengers: "Por quais messengers podemos contactar",
      areaTypology: "Area e tipologia",
      areaPlaceholder: "Por exemplo, 90-120 m², T2-T3",
      mustHave: "O que e essencial",
      mustHavePlaceholder: "Por exemplo, rua calma, edificio novo, perto da escola",
      message: "Mensagem livre",
      messagePlaceholder: "Pode descrever orcamento, prazos e preferencias adicionais",
      error: "E necessario indicar o telefone.",
      success: "Pedido enviado. Entraremos em contacto consigo em breve.",
      submit: "Enviar pedido",
    },
    en: {
      intro: [
        "Welcome to the property matching service.",
        "We will help you find a place that fits your plans.",
        "Leave your phone number and preferences. We will contact you soon.",
        "You can also call us or write on WhatsApp or Telegram.",
      ],
      contacts: "Contacts",
      namePlaceholder: "How should we address you",
      whatNeeded: "What is needed",
      unspecified: "Not specified",
      house: "House",
      apartment: "Apartment",
      land: "Land",
      messengers: "Which messengers can we use",
      areaTypology: "Area and typology",
      areaPlaceholder: "For example, 90-120 m², T2-T3",
      mustHave: "Must-have",
      mustHavePlaceholder: "For example, quiet street, new building, near a school",
      message: "Free message",
      messagePlaceholder: "You can briefly describe budget, timeline, and extra wishes",
      error: "A phone number is required.",
      success: "Request sent. We will contact you soon.",
      submit: "Send request",
    },
    ru: {
      intro: [
        "Приветствуем вас на сайте по подбору недвижимости.",
        "Мы обязательно найдем для вас место жительства вашей мечты.",
        "Оставьте ваш телефон и ваши пожелания. Мы свяжемся с вами в ближайшее время.",
        "Вы также можете позвонить нам или написать по WhatsApp или Telegram.",
      ],
      contacts: "Контакты",
      namePlaceholder: "Как к вам обращаться",
      whatNeeded: "Что необходимо",
      unspecified: "Не указано",
      house: "Дом",
      apartment: "Квартира",
      land: "Земля",
      messengers: "По каким мессенджерам можно связаться",
      areaTypology: "Площадь и типология",
      areaPlaceholder: "Например, 90-120 м², T2-T3",
      mustHave: "Что принципиально",
      mustHavePlaceholder: "Например, тихая улица, новый дом, рядом школа",
      message: "Произвольное сообщение",
      messagePlaceholder: "Можно коротко описать бюджет, сроки и дополнительные пожелания",
      error: "Нужно указать телефон.",
      success: "Запрос отправлен. Мы свяжемся с вами в ближайшее время.",
      submit: "Отправить запрос",
    },
    uk: {
      intro: [
        "Вітаємо вас на сайті з підбору нерухомості.",
        "Ми обов'язково знайдемо для вас житло, що відповідає вашим планам.",
        "Залиште телефон і побажання. Ми зв'яжемося з вами найближчим часом.",
        "Ви також можете зателефонувати нам або написати у WhatsApp чи Telegram.",
      ],
      contacts: "Контакти",
      namePlaceholder: "Як до вас звертатися",
      whatNeeded: "Що необхідно",
      unspecified: "Не вказано",
      house: "Будинок",
      apartment: "Квартира",
      land: "Земля",
      messengers: "Через які месенджери можна зв'язатися",
      areaTypology: "Площа і типологія",
      areaPlaceholder: "Наприклад, 90-120 m², T2-T3",
      mustHave: "Що принципово",
      mustHavePlaceholder: "Наприклад, тиха вулиця, новий будинок, поруч школа",
      message: "Довільне повідомлення",
      messagePlaceholder: "Можна коротко описати бюджет, строки і додаткові побажання",
      error: "Потрібно вказати телефон.",
      success: "Запит надіслано. Ми зв'яжемося з вами найближчим часом.",
      submit: "Надіслати запит",
    },
  }[language];

  const canSubmit = formState.phone.trim().length > 0;

  function updateField<Key extends keyof ContactFormState>(
    key: Key,
    value: ContactFormState[Key]
  ) {
    setFormState((currentState) => ({
      ...currentState,
      [key]: value,
    }));
    setSubmitState("idle");
  }

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
          name: formState.name,
          phone: formState.phone,
          messengers: formState.messengers,
          searchType: formState.searchType,
          location: formState.location,
          areaAndTypology: formState.areaAndTypology,
          mustHave: formState.mustHave,
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
    <main className="site-page-background min-h-screen text-slate-950">
      <section className="mx-auto max-w-[1380px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="-my-6 flex items-center sm:-my-8 lg:-my-10">
                <AgencyLogo priority className="h-[52px] w-auto sm:h-[62px]" />
              </Link>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <LanguageSwitcher language={language} onChange={setSiteLanguage} />
                <Link
                  href="/"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                >
                  {t.backToCatalog}
                </Link>
              </div>
            </div>

            <div className="mt-10 space-y-4 text-base leading-8 text-slate-600">
              {c.intro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-600">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {c.contacts}
                </div>
                <div className="mt-3 grid gap-1">
                  <div>{t.phoneRequired.replace(" (обязательно)", "").replace(" (required)", "").replace(" (obrigatorio)", "").replace(" (обов'язково)", "")}: +351 912 345 678</div>
                  <div>WhatsApp: +351 912 345 678</div>
                  <div>Telegram: @irina_real_estate</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <form className="grid gap-5" onSubmit={handleSubmit}>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {t.yourName}
                  </span>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder={c.namePlaceholder}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {t.phoneRequired}
                  </span>
                  <input
                    type="tel"
                    required
                    value={formState.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    placeholder="+351 ..."
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

              </div>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {c.whatNeeded}
                </span>
                <select
                  value={formState.searchType}
                  onChange={(event) => updateField("searchType", event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="">{c.unspecified}</option>
                  <option value={c.house}>{c.house}</option>
                  <option value={c.apartment}>{c.apartment}</option>
                  <option value={c.land}>{c.land}</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {c.messengers}
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
                    {t.location}
                  </span>
                  <input
                    type="text"
                    value={formState.location}
                    onChange={(event) => updateField("location", event.target.value)}
                    placeholder="Лиссабон, Кашкайш, Порту..."
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {c.areaTypology}
                  </span>
                  <input
                    type="text"
                    value={formState.areaAndTypology}
                    onChange={(event) => updateField("areaAndTypology", event.target.value)}
                    placeholder={c.areaPlaceholder}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {c.mustHave}
                </span>
                <input
                  type="text"
                  value={formState.mustHave}
                  onChange={(event) => updateField("mustHave", event.target.value)}
                  placeholder={c.mustHavePlaceholder}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {c.message}
                </span>
                <textarea
                  rows={5}
                  value={formState.message}
                  onChange={(event) => updateField("message", event.target.value)}
                  placeholder={c.messagePlaceholder}
                  className="resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              {submitState !== "idle" ? (
                <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-[#fbfdff] px-5 py-4 text-sm leading-7 text-slate-600">
                  {submitState === "error" ? (
                    <p>{c.error}</p>
                  ) : (
                    <p>{c.success}</p>
                  )}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  {c.submit}
                </button>
                <Link
                  href="/"
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                >
                  {t.backToCatalog}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
