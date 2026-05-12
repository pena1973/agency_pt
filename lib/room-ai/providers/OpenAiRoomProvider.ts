import OpenAI, { toFile } from "openai";
import { buildAnalyzeRoomPrompt } from "@/lib/room-ai/prompts/analyzeRoomPrompt";
import { buildLayoutVariantsPrompt } from "@/lib/room-ai/prompts/layoutVariantsPrompt";
import type {
  RoomAnalysis,
  RoomDimensions,
  RoomOpening,
  RoomType,
  RoomVariant,
} from "@/lib/room-ai/types";
import { env } from "@/lib/room-ai/utils/env";

const ROOM_AI_FALLBACK_IMAGE_URL = "/mock/property-placeholder.svg";

type AnalyzeRoomInput = {
  photos: File[];
  roomType: RoomType;
  roomDimensions?: RoomDimensions;
  peopleCount?: number;
  palette?: string;
};

type GenerateLayoutVariantsInput = {
  photos: File[];
  roomType: RoomType;
  roomAnalysis: RoomAnalysis;
  roomDimensions?: RoomDimensions;
  peopleCount?: number;
  palette?: string;
};

type RefineVariantFromPhotoInput = {
  originalPhotos: File[];
  generatedPhotoDataUrl: string;
  roomType: RoomType;
  roomAnalysis: RoomAnalysis;
  roomDimensions?: RoomDimensions;
  variant: RoomVariant;
};

type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  generatedImages: number;
};

export class OpenAiRoomProvider {
  private client: OpenAI;
  private usage: TokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    generatedImages: 0,
  };

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  async analyzeRoom(input: AnalyzeRoomInput): Promise<RoomAnalysis> {
    const prompt = buildAnalyzeRoomPrompt({
      roomType: input.roomType,
      roomDimensions: input.roomDimensions,
      peopleCount: input.peopleCount,
      palette: input.palette,
    });

    const imageInputs = await this.createImageInputs(input.photos);

    const response = await this.client.responses.create({
      model: env.OPENAI_VISION_MODEL,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
            ...imageInputs,
          ],
        },
      ],
    });
    this.recordUsage(response);

    const text = response.output_text;

    if (!text) {
      throw new Error("OpenAI returned empty room analysis.");
    }

    return this.parseRoomAnalysis(text);
  }

  async generateLayoutVariants(
    input: GenerateLayoutVariantsInput
  ): Promise<RoomVariant[]> {
    const prompt = buildLayoutVariantsPrompt(input);
    const imageInputs = await this.createImageInputs(input.photos);

    const response = await this.client.responses.create({
      model: env.OPENAI_VISION_MODEL,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
            ...imageInputs,
          ],
        },
      ],
    });
    this.recordUsage(response);

    const text = response.output_text;

    if (!text) {
      throw new Error("OpenAI returned empty layout variants.");
    }

    return this.parseLayoutVariants(text);
  }

  async generateVariantPhoto(params: {
    photos: File[];
    roomType: RoomType;
    roomAnalysis: RoomAnalysis;
    variant: RoomVariant;
  }): Promise<string> {
    const prompt = this.buildPhotoGenerationPrompt({
      roomType: params.roomType,
      roomAnalysis: params.roomAnalysis,
      variant: params.variant,
    });

    const firstPhoto = params.photos[0];

    if (!firstPhoto) {
      throw new Error("Нет исходного фото для генерации интерьера.");
    }

    const buffer = Buffer.from(await firstPhoto.arrayBuffer());

    const imageFile = await toFile(buffer, firstPhoto.name || "room-photo.png", {
      type: firstPhoto.type || "image/png",
    });

    const result = await this.client.images.edit({
      model: env.OPENAI_IMAGE_MODEL,
      image: imageFile,
      prompt,
      size: "1536x1024",
    } as never);
    this.recordUsage(result);
    this.usage.generatedImages += 1;

    const imageBase64 = result.data?.[0]?.b64_json;

    if (!imageBase64) {
      throw new Error("Не удалось получить изображение комнаты.");
    }

    return `data:image/png;base64,${imageBase64}`;
  }

  async refineVariantFromPhoto(
    input: RefineVariantFromPhotoInput
  ): Promise<Pick<RoomVariant, "furniture" | "openings" | "description">> {
    const prompt = this.buildPlanFromPhotoPrompt(input);
    const originalImageInputs = await this.createImageInputs(input.originalPhotos.slice(0, 1));

    const response = await this.client.responses.create({
      model: env.OPENAI_VISION_MODEL,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
            ...originalImageInputs,
            {
              type: "input_image",
              image_url: input.generatedPhotoDataUrl,
              detail: "high",
            },
          ],
        },
      ],
    });
    this.recordUsage(response);

    const text = response.output_text;

    if (!text) {
      throw new Error("OpenAI returned empty refined layout.");
    }

    return this.parseRefinedVariant(text, input.variant);
  }

  private parseRoomAnalysis(rawText: string): RoomAnalysis {
    try {
      const cleaned = rawText
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();

      const parsed = JSON.parse(cleaned) as RoomAnalysis;

      return {
        estimatedDimensions: {
          widthM: parsed.estimatedDimensions?.widthM ?? null,
          lengthM: parsed.estimatedDimensions?.lengthM ?? null,
          heightM: parsed.estimatedDimensions?.heightM ?? null,
          confidence: parsed.estimatedDimensions?.confidence ?? "low",
        },
        detectedObjects: Array.isArray(parsed.detectedObjects)
          ? parsed.detectedObjects
          : [],
        removableObjects: Array.isArray(parsed.removableObjects)
          ? parsed.removableObjects
          : [],
        fixedElements: Array.isArray(parsed.fixedElements)
          ? parsed.fixedElements
          : [],
        constraints: Array.isArray(parsed.constraints) ? parsed.constraints : [],
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        openings: this.parseOpenings(parsed.openings, "analysis_opening"),
      };
    } catch {
      throw new Error(`Failed to parse OpenAI room analysis: ${rawText}`);
    }
  }

  getUsage(): TokenUsage {
    return { ...this.usage };
  }

  private recordUsage(response: unknown) {
    const usage = (response as { usage?: Record<string, unknown> }).usage;

    if (!usage) {
      return;
    }

    const inputTokens =
      Number(usage.input_tokens ?? usage.prompt_tokens ?? 0) || 0;
    const outputTokens =
      Number(usage.output_tokens ?? usage.completion_tokens ?? 0) || 0;
    const totalTokens =
      Number(usage.total_tokens ?? inputTokens + outputTokens) || 0;

    this.usage.inputTokens += inputTokens;
    this.usage.outputTokens += outputTokens;
    this.usage.totalTokens += totalTokens;
  }

  private parseLayoutVariants(rawText: string): RoomVariant[] {
    try {
      const cleaned = rawText
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();

      const parsed = JSON.parse(cleaned) as { variants?: RoomVariant[] };

      if (!Array.isArray(parsed.variants)) {
        throw new Error("Missing variants array.");
      }

      return parsed.variants.slice(0, 1).map((variant, index) => {
        const variantNumber = index + 1;

        return {
          id: variant.id || `variant_${variantNumber}`,
          title: variant.title || `Вариант ${variantNumber}`,
          description: variant.description || "Вариант расстановки мебели.",
          photoImageUrl: ROOM_AI_FALLBACK_IMAGE_URL,
          planImageUrl: ROOM_AI_FALLBACK_IMAGE_URL,
          layoutSource: "ai",
          palette: Array.isArray(variant.palette)
            ? variant.palette
            : ["#f8fafc", "#e2e8f0", "#94a3b8"],
          pros: Array.isArray(variant.pros) ? variant.pros : [],
          cons: Array.isArray(variant.cons) ? variant.cons : [],
          furniture: Array.isArray(variant.furniture)
            ? variant.furniture.map((item, itemIndex) => ({
                id: item.id || `variant_${variantNumber}_furniture_${itemIndex + 1}`,
                type: item.type || "furniture",
                label: item.label || `Мебель ${itemIndex + 1}`,
                xM: Number.isFinite(Number(item.xM)) ? Number(item.xM) : 0,
                yM: Number.isFinite(Number(item.yM)) ? Number(item.yM) : 0,
                widthM: Number.isFinite(Number(item.widthM))
                  ? Number(item.widthM)
                  : 0.8,
                depthM: Number.isFinite(Number(item.depthM))
                  ? Number(item.depthM)
                  : 0.6,
                rotationDeg: Number.isFinite(Number(item.rotationDeg))
                  ? Number(item.rotationDeg)
                  : 0,
                color: item.color,
              }))
            : [],
          openings: this.parseOpenings(variant.openings, `opening_${variantNumber}`),
        };
      });
    } catch {
      throw new Error(`Failed to parse OpenAI layout variants: ${rawText}`);
    }
  }

  private parseRefinedVariant(
    rawText: string,
    fallbackVariant: RoomVariant
  ): Pick<RoomVariant, "furniture" | "openings" | "description"> {
    try {
      const cleaned = rawText
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();

      const parsed = JSON.parse(cleaned) as Partial<RoomVariant>;

      return {
        description:
          typeof parsed.description === "string"
            ? parsed.description
            : fallbackVariant.description,
        furniture: Array.isArray(parsed.furniture)
          ? parsed.furniture.map((item, itemIndex) => ({
              id: item.id || `${fallbackVariant.id}_photo_furniture_${itemIndex + 1}`,
              type: item.type || "furniture",
              label: item.label || `Мебель ${itemIndex + 1}`,
              xM: Number.isFinite(Number(item.xM)) ? Number(item.xM) : 0,
              yM: Number.isFinite(Number(item.yM)) ? Number(item.yM) : 0,
              widthM: Number.isFinite(Number(item.widthM))
                ? Number(item.widthM)
                : 0.8,
              depthM: Number.isFinite(Number(item.depthM))
                ? Number(item.depthM)
                : 0.6,
              rotationDeg: Number.isFinite(Number(item.rotationDeg))
                ? Number(item.rotationDeg)
                : 0,
              color: item.color,
            }))
          : fallbackVariant.furniture,
        openings: this.parseOpenings(
          parsed.openings,
          `${fallbackVariant.id}_photo_opening`
        ),
      };
    } catch {
      throw new Error(`Failed to parse refined layout variant: ${rawText}`);
    }
  }

  private async createImageInputs(photos: File[]) {
    return Promise.all(
      photos.map(async (photo) => {
        const base64 = Buffer.from(await photo.arrayBuffer()).toString("base64");
        const mimeType = photo.type || "image/jpeg";

        return {
          type: "input_image" as const,
          image_url: `data:${mimeType};base64,${base64}`,
          detail: "auto" as const,
        };
      })
    );
  }

  private parseOpenings(openings: unknown, prefix: string): RoomOpening[] {
    if (!Array.isArray(openings)) {
      return [];
    }

    return openings.map((opening, index) => {
      const item = opening as Partial<RoomOpening>;

      return {
        id: item.id || `${prefix}_${index + 1}`,
        type: item.type === "window" ? "window" : "door",
        wall:
          item.wall === "top" ||
          item.wall === "right" ||
          item.wall === "bottom" ||
          item.wall === "left"
            ? item.wall
            : "top",
        offsetM: Number.isFinite(Number(item.offsetM)) ? Number(item.offsetM) : 0.3,
        widthM: Number.isFinite(Number(item.widthM))
          ? Number(item.widthM)
          : item.type === "window"
            ? 1.2
            : 0.8,
        label: typeof item.label === "string" ? item.label : undefined,
        hinge:
          item.hinge === "start" || item.hinge === "end"
            ? item.hinge
            : undefined,
        swing:
          item.swing === "in" || item.swing === "out"
            ? item.swing
            : undefined,
      };
    });
  }

  private buildPhotoGenerationPrompt(params: {
    roomType: RoomType;
    roomAnalysis: RoomAnalysis;
    variant: RoomVariant;
  }): string {
    const furnitureList = params.variant.furniture
      .map(
        (item) =>
          `- ${item.label} (${item.type}), x=${item.xM}, y=${item.yM}, width=${item.widthM}, depth=${item.depthM}, rotation=${item.rotationDeg}`
      )
      .join("\n");

    return `
Ты — интерьерный визуализатор.

Нужно отредактировать исходное фото комнаты.

Задача:
- очистить помещение от лишних вещей и визуального шума;
- сохранить архитектуру комнаты, пропорции, окно, дверь и перспективу максимально близко к исходному фото;
- стены, пол и потолок можно перекрасить или визуально обновить при необходимости, если это помогает стилю, свету и мебели;
- обставить комнату мебелью строго по описанию варианта;
- сделать реалистичный интерьерный рендер, как фотография;
- стиль спокойный, современный, аккуратный;
- не перегружать интерьер;
- соблюдать назначение комнаты.

Тип комнаты: ${params.roomType}
Название варианта: ${params.variant.title}
Описание варианта: ${params.variant.description}

Палитра:
${params.variant.palette?.join(", ") || "нейтральная"}

Мебель:
${furnitureList}

Ограничения помещения:
${params.roomAnalysis.constraints.join("\n")}

Важно:
- результат должен выглядеть как реальное фото комнаты после меблировки;
- сохрани точку обзора исходной фотографии;
- не меняй форму комнаты без необходимости;
- мебель должна быть пропорциональной;
- можно добавить текстиль, освещение и небольшой декор, но умеренно;
- изображение без текста, без подписей, без схем, только интерьерное фото.
  `.trim();
  }

  private buildPlanFromPhotoPrompt(input: RefineVariantFromPhotoInput): string {
    const widthM =
      input.roomDimensions?.widthM ??
      input.roomAnalysis.estimatedDimensions.widthM ??
      null;
    const lengthM =
      input.roomDimensions?.lengthM ??
      input.roomAnalysis.estimatedDimensions.lengthM ??
      null;

    return `
Ты анализируешь интерьерное фото и строишь по нему реалистичный план сверху.

Тебе переданы:
1. исходное фото пустой комнаты;
2. сгенерированное фото этой же комнаты с мебелью.

Нужно вернуть исправленный JSON для плана расстановки, опираясь в первую очередь на фото с мебелью, но сверяя архитектуру с исходной комнатой.

Тип комнаты: ${input.roomType}
Ширина комнаты: ${widthM ?? "неизвестно"} м
Длина комнаты: ${lengthM ?? "неизвестно"} м
Текущий вариант: ${input.variant.title}
Текущее описание: ${input.variant.description}

Ограничения и контекст:
${input.roomAnalysis.constraints.join("\n")}

Критически важно:
- не придумывай другую архитектуру комнаты;
- окно и дверь должны остаться на своих реальных местах;
- соблюдай пропорции проёмов относительно стены;
- особенно важно сохранить расстояния от окна до левого и правого углов стены такими, какими они выглядят на исходной фотографии;
- если окно визуально смещено к одной стороне стены, это смещение должно читаться и на плане;
- центр комнаты и проход к окну должны соответствовать фото;
- мебель ставь так, как она выглядит на фото с мебелью, а не по старому плану;
- не выравнивай автоматически окно по центру стены, если на фото оно не по центру;
- не добавляй лишнюю мебель, которой нет на фото.

Ответ должен быть только валидным JSON без markdown.

Верни JSON строго в этой форме:
{
  "description": "string",
  "openings": [
    {
      "id": "window_1",
      "type": "window" | "door",
      "wall": "top" | "right" | "bottom" | "left",
      "offsetM": number,
      "widthM": number,
      "label": "string",
      "hinge": "start" | "end",
      "swing": "in" | "out"
    }
  ],
  "furniture": [
    {
      "id": "string",
      "type": "bed",
      "label": "string",
      "xM": number,
      "yM": number,
      "widthM": number,
      "depthM": number,
      "rotationDeg": number,
      "color": "string"
    }
  ]
}
`.trim();
  }
}
