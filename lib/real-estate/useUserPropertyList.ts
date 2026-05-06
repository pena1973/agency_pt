"use client";

import { useEffect, useState } from "react";

type UserPreferencesPayload = {
  favoriteIds: string[];
  compareIds: string[];
};

type UseUserPropertyListOptions = {
  storageKey: string;
  changeEvent: string;
  responseKey: keyof UserPreferencesPayload;
  requestKey: keyof UserPreferencesPayload;
  maxItems?: number;
};

function parseIds(rawValue: string | null): string[] {
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

function normalizeIds(ids: string[], maxItems?: number): string[] {
  const nextIds = Array.from(new Set(ids.filter((item) => typeof item === "string")));
  return typeof maxItems === "number" ? nextIds.slice(0, maxItems) : nextIds;
}

function areIdsEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

export function useUserPropertyList({
  storageKey,
  changeEvent,
  responseKey,
  requestKey,
  maxItems,
}: UseUserPropertyListOptions) {
  const [ids, setIds] = useState<string[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function readLocalIds(): string[] {
      return normalizeIds(window.localStorage.getItem(storageKey) ? parseIds(window.localStorage.getItem(storageKey)) : [], maxItems);
    }

    function writeLocalIds(nextIds: string[]): void {
      window.localStorage.setItem(storageKey, JSON.stringify(nextIds));
      window.dispatchEvent(new Event(changeEvent));
    }

    async function loadIds() {
      const localIds = readLocalIds();

      try {
        const response = await fetch("/api/user/preferences", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          setIsAuthenticated(false);
          setIds(localIds);
          return;
        }

        const payload = (await response.json()) as UserPreferencesPayload;
        const serverIds = normalizeIds(payload[responseKey] ?? [], maxItems);
        const mergedIds = normalizeIds([...serverIds, ...localIds], maxItems);

        setIsAuthenticated(true);
        setIds(mergedIds);

        if (!areIdsEqual(localIds, mergedIds)) {
          writeLocalIds(mergedIds);
        }

        if (!areIdsEqual(serverIds, mergedIds)) {
          await fetch("/api/user/preferences", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ [requestKey]: mergedIds }),
          });
        }
      } catch {
        setIsAuthenticated(false);
        setIds(localIds);
      }
    }

    void loadIds();

    const handleLocalChange = () => {
      setIds(readLocalIds());
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === storageKey) {
        setIds(readLocalIds());
      }
    };

    window.addEventListener(changeEvent, handleLocalChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(changeEvent, handleLocalChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [changeEvent, maxItems, requestKey, responseKey, storageKey]);

  async function persistIds(nextIds: string[]): Promise<void> {
    const normalizedIds = normalizeIds(nextIds, maxItems);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(normalizedIds));
      window.dispatchEvent(new Event(changeEvent));
    }

    setIds(normalizedIds);

    if (!isAuthenticated) {
      return;
    }

    try {
      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ [requestKey]: normalizedIds }),
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as UserPreferencesPayload;
      const confirmedIds = normalizeIds(payload[responseKey] ?? normalizedIds, maxItems);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, JSON.stringify(confirmedIds));
        window.dispatchEvent(new Event(changeEvent));
      }

      setIds(confirmedIds);
    } catch {
      // Keep optimistic local state; the next load will reconcile with the server.
    }
  }

  return {
    ids,
    persistIds,
  };
}
