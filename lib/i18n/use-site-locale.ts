"use client";

import { useEffect, useState } from "react";
import {
  defaultSiteLocale,
  isSiteLocale,
  type SiteLocale,
} from "@/lib/i18n/site";

export function useSiteLocale() {
  const [locale, setLocale] = useState<SiteLocale>(defaultSiteLocale);

  useEffect(() => {
    const savedLocale = window.localStorage.getItem("siteLocale");

    if (savedLocale && isSiteLocale(savedLocale)) {
      setLocale(savedLocale);
    }
  }, []);

  function updateLocale(nextLocale: SiteLocale) {
    setLocale(nextLocale);
    window.localStorage.setItem("siteLocale", nextLocale);
  }

  return [locale, updateLocale] as const;
}
