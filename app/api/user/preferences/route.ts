import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  readUserPreferencesFromDb,
  replaceCompareItemsInDb,
  replaceFavoritesInDb,
  saveSearchProfileInDb,
  type SearchPreferencesPayload,
} from "@/lib/db/user-preferences";

function normalizeIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter((item): item is string => typeof item === "string");
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preferences = await readUserPreferencesFromDb(user.id);
    return NextResponse.json(preferences);
  } catch {
    return NextResponse.json(
      { error: "Не удалось получить пользовательские списки." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json()) as {
      favoriteIds?: unknown;
      compareIds?: unknown;
      searchProfile?: SearchPreferencesPayload;
    };

    const nextFavoriteIds = normalizeIds(payload.favoriteIds);
    const nextCompareIds = normalizeIds(payload.compareIds);

    if (!nextFavoriteIds && !nextCompareIds && !payload.searchProfile) {
      return NextResponse.json(
        { error: "Не переданы данные для обновления." },
        { status: 400 }
      );
    }

    const current = await readUserPreferencesFromDb(user.id);

    const favoriteIds = nextFavoriteIds
      ? await replaceFavoritesInDb(user.id, nextFavoriteIds)
      : current.favoriteIds;

    const compareIds = nextCompareIds
      ? await replaceCompareItemsInDb(user.id, nextCompareIds)
      : current.compareIds;

    const searchProfile = payload.searchProfile
      ? await saveSearchProfileInDb(user.id, payload.searchProfile)
      : current.searchProfile;

    return NextResponse.json({ favoriteIds, compareIds, searchProfile });
  } catch {
    return NextResponse.json(
      { error: "Не удалось обновить пользовательские списки." },
      { status: 500 }
    );
  }
}
