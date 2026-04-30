"use client";

import { useState } from "react";

const COOKIE_NAME = "irina_cookie_consent";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

function writeCookie(name: string, value: string, maxAge: number): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

type CookieConsentBannerProps = {
  initialAccepted: boolean;
};

export function CookieConsentBanner({
  initialAccepted,
}: CookieConsentBannerProps) {
  const [isVisible, setIsVisible] = useState(!initialAccepted);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-8 md:right-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur md:flex-row md:items-center md:justify-between">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Cookies
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Мы используем cookies для сохранения языка, предпочтений каталога и
            улучшения работы сайта. Продолжая пользоваться сайтом, вы соглашаетесь
            с использованием cookies.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            writeCookie(COOKIE_NAME, "accepted", COOKIE_MAX_AGE);
            setIsVisible(false);
          }}
          className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Принять
        </button>
      </div>
    </div>
  );
}
