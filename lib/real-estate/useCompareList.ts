"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "irina_compare_ids";
const CHANGE_EVENT = "irina-compare-change";
const EMPTY_COMPARE_IDS: string[] = [];
let cachedRawValue: string | null = null;
let cachedCompareIds: string[] = EMPTY_COMPARE_IDS;

function parseCompareIds(rawValue: string | null): string[] {
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

function getCompareIdsSnapshot(): string[] {
  if (typeof window === "undefined") {
    return EMPTY_COMPARE_IDS;
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);

  if (rawValue === cachedRawValue) {
    return cachedCompareIds;
  }

  const nextIds = parseCompareIds(rawValue);
  cachedRawValue = rawValue;
  cachedCompareIds = nextIds.length > 0 ? nextIds : EMPTY_COMPARE_IDS;

  return cachedCompareIds;
}

function emitCompareChange(): void {
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

function writeCompareIds(nextIds: string[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextIds));
  emitCompareChange();
}

export function useCompareList() {
  const compareIds = useSyncExternalStore(
    subscribe,
    getCompareIdsSnapshot,
    () => EMPTY_COMPARE_IDS
  );

  function toggleCompare(propertyId: string): void {
    const currentIds = getCompareIdsSnapshot();

    if (currentIds.includes(propertyId)) {
      writeCompareIds(currentIds.filter((id) => id !== propertyId));
      return;
    }

    if (currentIds.length >= 4) {
      writeCompareIds([...currentIds.slice(1), propertyId]);
      return;
    }

    writeCompareIds([...currentIds, propertyId]);
  }

  function removeCompare(propertyId: string): void {
    const currentIds = getCompareIdsSnapshot();
    writeCompareIds(currentIds.filter((id) => id !== propertyId));
  }

  function clearCompare(): void {
    writeCompareIds([]);
  }

  return {
    compareIds,
    toggleCompare,
    removeCompare,
    clearCompare,
  };
}
