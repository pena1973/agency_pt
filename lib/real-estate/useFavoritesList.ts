"use client";

import { useUserPropertyList } from "@/lib/real-estate/useUserPropertyList";

const STORAGE_KEY = "irina_favorite_ids";
const CHANGE_EVENT = "irina-favorite-change";

export function useFavoritesList() {
  const { ids: favoriteIds, persistIds } = useUserPropertyList({
    storageKey: STORAGE_KEY,
    changeEvent: CHANGE_EVENT,
    responseKey: "favoriteIds",
    requestKey: "favoriteIds",
  });

  function toggleFavorite(propertyId: string): void {
    const currentIds = favoriteIds;

    if (currentIds.includes(propertyId)) {
      void persistIds(currentIds.filter((id) => id !== propertyId));
      return;
    }

    void persistIds([...currentIds, propertyId]);
  }

  return {
    favoriteIds,
    toggleFavorite,
  };
}
