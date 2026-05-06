"use client";

import { useUserPropertyList } from "@/lib/real-estate/useUserPropertyList";

const STORAGE_KEY = "irina_compare_ids";
const CHANGE_EVENT = "irina-compare-change";

export function useCompareList() {
  const { ids: compareIds, persistIds } = useUserPropertyList({
    storageKey: STORAGE_KEY,
    changeEvent: CHANGE_EVENT,
    responseKey: "compareIds",
    requestKey: "compareIds",
    maxItems: 4,
  });

  function toggleCompare(propertyId: string): void {
    const currentIds = compareIds;

    if (currentIds.includes(propertyId)) {
      void persistIds(currentIds.filter((id) => id !== propertyId));
      return;
    }

    if (currentIds.length >= 4) {
      void persistIds([...currentIds.slice(1), propertyId]);
      return;
    }

    void persistIds([...currentIds, propertyId]);
  }

  function removeCompare(propertyId: string): void {
    void persistIds(compareIds.filter((id) => id !== propertyId));
  }

  function clearCompare(): void {
    void persistIds([]);
  }

  return {
    compareIds,
    toggleCompare,
    removeCompare,
    clearCompare,
  };
}
