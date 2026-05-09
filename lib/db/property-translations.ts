import { sqlite } from "@/lib/db/client";
import type {
  PropertyContentLocale,
  PropertyContentTranslation,
} from "@/lib/real-estate/types";

export type StoredPropertyTranslations = {
  sourceLocale?: PropertyContentLocale;
  translations: Partial<Record<PropertyContentLocale, PropertyContentTranslation>>;
};

function ensurePropertyTranslationsTable() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS property_translations (
      property_id TEXT NOT NULL,
      locale TEXT NOT NULL,
      source_locale TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      short_description TEXT NOT NULL DEFAULT '',
      full_description TEXT NOT NULL DEFAULT '',
      orientation TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (property_id, locale),
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS property_translations_property_id_idx
      ON property_translations(property_id);
  `);
}

function isContentLocale(value: unknown): value is PropertyContentLocale {
  return value === "pt" || value === "en" || value === "ru" || value === "uk";
}

function parseOrientation(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function readPropertyTranslationsForPropertyIds(
  propertyIds: string[]
): Map<string, StoredPropertyTranslations> {
  ensurePropertyTranslationsTable();

  if (propertyIds.length === 0) {
    return new Map();
  }

  const placeholders = propertyIds.map(() => "?").join(", ");
  const rows = sqlite
    .prepare(
      `
        SELECT property_id, locale, source_locale, title, city, short_description,
          full_description, orientation
        FROM property_translations
        WHERE property_id IN (${placeholders})
      `
    )
    .all(...propertyIds) as Array<{
    property_id: string;
    locale: string;
    source_locale: string;
    title: string;
    city: string;
    short_description: string;
    full_description: string;
    orientation: string;
  }>;

  const result = new Map<string, StoredPropertyTranslations>();

  for (const row of rows) {
    if (!isContentLocale(row.locale)) {
      continue;
    }

    const current = result.get(row.property_id) ?? { translations: {} };
    if (isContentLocale(row.source_locale)) {
      current.sourceLocale = row.source_locale;
    }

    current.translations[row.locale] = {
      title: row.title,
      city: row.city,
      shortDescription: row.short_description,
      fullDescription: row.full_description,
      orientation: parseOrientation(row.orientation),
    };
    result.set(row.property_id, current);
  }

  return result;
}

export function replacePropertyTranslations(
  propertyId: string,
  sourceLocale: PropertyContentLocale | undefined,
  translations: Partial<Record<PropertyContentLocale, PropertyContentTranslation>> | undefined
) {
  ensurePropertyTranslationsTable();

  const normalizedSourceLocale = sourceLocale ?? "ru";
  const now = Date.now();
  const entries = Object.entries(translations ?? {}).filter(
    (entry): entry is [PropertyContentLocale, PropertyContentTranslation] =>
      isContentLocale(entry[0])
  );

  const transaction = sqlite.transaction(() => {
    sqlite
      .prepare("DELETE FROM property_translations WHERE property_id = ?")
      .run(propertyId);

    const insert = sqlite.prepare(`
      INSERT INTO property_translations (
        property_id, locale, source_locale, title, city, short_description,
        full_description, orientation, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const [locale, translation] of entries) {
      insert.run(
        propertyId,
        locale,
        normalizedSourceLocale,
        translation.title,
        translation.city,
        translation.shortDescription,
        translation.fullDescription,
        JSON.stringify(translation.orientation),
        now,
        now
      );
    }
  });

  transaction();
}
