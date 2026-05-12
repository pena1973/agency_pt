"use client";

import { siteLocales, type SiteLocale } from "@/lib/i18n/site";

type LanguageSwitcherProps = {
  language: SiteLocale;
  onChange: (locale: SiteLocale) => void;
  className?: string;
  buttonClassName?: string;
  activeButtonClassName?: string;
  inactiveButtonClassName?: string;
};

export function LanguageSwitcher({
  language,
  onChange,
  className = "flex items-center rounded-[18px] border border-slate-200 bg-white p-1 shadow-sm",
  buttonClassName = "rounded-[14px] px-2.5 py-1.5 text-xs font-semibold transition sm:px-4 sm:py-2.5 sm:text-sm",
  activeButtonClassName = "bg-slate-950 text-white",
  inactiveButtonClassName = "text-slate-600 hover:text-slate-950",
}: LanguageSwitcherProps) {
  return (
    <div className={className}>
      {siteLocales.map((item) => (
        <button
          key={item.code}
          type="button"
          onClick={() => onChange(item.code)}
          className={`${buttonClassName} ${
            language === item.code ? activeButtonClassName : inactiveButtonClassName
          }`}
          aria-pressed={language === item.code}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
