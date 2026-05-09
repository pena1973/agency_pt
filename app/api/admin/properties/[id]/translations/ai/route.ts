import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAccess } from "@/lib/auth/admin-access";
import type { SiteLocale } from "@/lib/i18n/site";
import { readPropertyListings } from "@/lib/real-estate/storage";
import type { PropertyContentTranslation } from "@/lib/real-estate/types";
import { env } from "@/lib/room-ai/utils/env";

type PropertyTranslationRouteContext = {
  params: Promise<{ id: string }>;
};

const requestSchema = z.object({
  sourceLocale: z.enum(["pt", "en", "ru", "uk"]),
  targetLocale: z.enum(["pt", "en", "ru", "uk"]),
  sourceContent: z.object({
    title: z.string(),
    city: z.string(),
    shortDescription: z.string(),
    fullDescription: z.string(),
    orientation: z.array(z.string()),
  }),
});

const translationResponseSchema = z.object({
  translation: z.object({
    title: z.string(),
    city: z.string(),
    shortDescription: z.string(),
    fullDescription: z.string(),
    orientation: z.array(z.string()),
  }),
});

const localeNames: Record<SiteLocale, string> = {
  pt: "Portuguese",
  en: "English",
  ru: "Russian",
  uk: "Ukrainian",
};

function buildTranslationPrompt(
  sourceLocale: SiteLocale,
  targetLocale: SiteLocale,
  sourceContent: PropertyContentTranslation
) {
  return `Translate real estate listing content from ${localeNames[sourceLocale]} to ${localeNames[targetLocale]}.

Return ONLY valid JSON in this exact shape:
{
  "translation": {
    "title": "...",
    "city": "...",
    "shortDescription": "...",
    "fullDescription": "...",
    "orientation": ["..."]
  }
}

Rules:
- Translate only title, city, shortDescription, fullDescription, and orientation.
- Do not translate or invent the address.
- Preserve facts, numbers, prices, proper names, and real estate meaning.
- Keep orientation as an array of short translated strings.

Source content:
${JSON.stringify(sourceContent, null, 2)}`;
}

export async function POST(request: Request, context: PropertyTranslationRouteContext) {
  try {
    const forbiddenResponse = await requireAdminApiAccess();
    if (forbiddenResponse) return forbiddenResponse;

    const { id } = await context.params;
    const { sourceLocale, targetLocale, sourceContent } = requestSchema.parse(await request.json());
    const properties = await readPropertyListings();
    const propertyIndex = properties.findIndex((property) => property.id === id);

    if (propertyIndex === -1) {
      return NextResponse.json({ error: "Объект не найден." }, { status: 404 });
    }

    const property = properties[propertyIndex];
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: env.OPENAI_TEXT_MODEL,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildTranslationPrompt(sourceLocale, targetLocale, sourceContent),
            },
          ],
        },
      ],
    });

    const parsed = translationResponseSchema.parse(JSON.parse(response.output_text));

    return NextResponse.json({
      sourceLocale,
      targetLocale,
      translation: parsed.translation,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Не удалось создать переводы объекта." },
      { status: 500 }
    );
  }
}
