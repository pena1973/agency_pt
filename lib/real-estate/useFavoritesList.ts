"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "irina_favorite_ids";
const CHANGE_EVENT = "irina-favorite-change";
const EMPTY_FAVORITE_IDS: string[] = [];
let cachedRawValue: string | null = null;
let cachedFavoriteIds: string[] = EMPTY_FAVORITE_IDS;

function parseFavoriteIds(rawValue: string | null): string[] {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function getFavoriteIdsSnapshot(): string[] {
  if (typeof window === "undefined") {
    return EMPTY_FAVORITE_IDS;
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);

  if (rawValue === cachedRawValue) {
    return cachedFavoriteIds;
  }

  const nextIds = parseFavoriteIds(rawValue);
  cachedRawValue = rawValue;
  cachedFavoriteIds = nextIds.length > 0 ? nextIds : EMPTY_FAVORITE_IDS;

  return cachedFavoriteIds;
}

function emitFavoriteChange(): void {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

function writeFavoriteIds(nextIds: string[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextIds));
  emitFavoriteChange();
}

export function useFavoritesList() {
  const favoriteIds = useSyncExternalStore(
    subscribe,
    getFavoriteIdsSnapshot,
    () => EMPTY_FAVORITE_IDS
  );

  function toggleFavorite(propertyId: string): void {
    const currentIds = getFavoriteIdsSnapshot();

    if (currentIds.includes(propertyId)) {
      writeFavoriteIds(currentIds.filter((id) => id !== propertyId));
      return;
    }

    writeFavoriteIds([...currentIds, propertyId]);
  }

  return {
    favoriteIds,
    toggleFavorite,
  };
}
