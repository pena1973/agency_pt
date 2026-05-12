import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { resolveMediaStoragePath } from "@/lib/media/storage";
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
      text: { format: { type: "json_object" } },
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
      text: { format: { type: "json_object" } },
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
      throw new Error("ÐÐµÑ‚ Ð¸ÑÑ…Ð¾Ð´Ð½Ð¾Ð³Ð¾ Ñ„Ð¾Ñ‚Ð¾ Ð´Ð»Ñ Ð³ÐµÐ½ÐµÑ€Ð°Ñ†Ð¸Ð¸ Ð¸Ð½Ñ‚ÐµÑ€ÑŒÐµÑ€Ð°.");
    }

    const buffer = Buffer.from(await firstPhoto.arrayBuffer());
    const sourceMetadata = await sharp(buffer).metadata();
    const sourceWidth = sourceMetadata.width ?? 1024;
    const sourceHeight = sourceMetadata.height ?? 1024;
    const outputSize = this.getImageOutputSize(
      sourceWidth,
      sourceHeight
    );
    const structuralGuideBuffer = await this.createStructuralGuideImage(buffer, sourceWidth, sourceHeight);

    const imageFile = await toFile(buffer, firstPhoto.name || "room-photo.png", {
      type: firstPhoto.type || "image/png",
    });
    const structuralGuideFile = await toFile(
      structuralGuideBuffer,
      "room-structural-lock-guide.png",
      { type: "image/png" }
    );

    const imageEditRequest = {
      model: env.OPENAI_IMAGE_MODEL,
      image: [imageFile, structuralGuideFile],
      prompt,
      input_fidelity: "high",
      quality: "high",
      size: outputSize,
    } as Record<string, unknown>;

    const result = await this.client.images.edit(imageEditRequest as never);
    this.recordUsage(result);
    this.usage.generatedImages += 1;

    const imageBase64 = result.data?.[0]?.b64_json;

    if (!imageBase64) {
      throw new Error("ÐÐµ ÑƒÐ´Ð°Ð»Ð¾ÑÑŒ Ð¿Ð¾Ð»ÑƒÑ‡Ð¸Ñ‚ÑŒ Ð¸Ð·Ð¾Ð±Ñ€Ð°Ð¶ÐµÐ½Ð¸Ðµ ÐºÐ¾Ð¼Ð½Ð°Ñ‚Ñ‹.");
    }

    const rawGeneratedDataUrl = `data:image/png;base64,${imageBase64}`;
    const normalizedDataUrl = await this.normalizeGeneratedImageToSourceFrame(
      rawGeneratedDataUrl,
      buffer,
      sourceWidth,
      sourceHeight
    );

    await this.writeDebugGenerationFiles({
      sourceBuffer: buffer,
      structuralGuideBuffer,
      rawGeneratedDataUrl,
      normalizedDataUrl,
      sourceWidth,
      sourceHeight,
    });

    return normalizedDataUrl;
  }

  private getImageOutputSize(
    width: number,
    height: number
  ): "1024x1024" | "1536x1024" | "1024x1536" {
    if (!width || !height) {
      return "1536x1024";
    }

    const aspectRatio = width / height;

    if (aspectRatio > 1.15) {
      return "1536x1024";
    }

    if (aspectRatio < 0.87) {
      return "1024x1536";
    }

    return "1024x1024";
  }

  private async normalizeGeneratedImageToSourceFrame(
    dataUrl: string,
    sourceBuffer: Buffer,
    sourceWidth?: number,
    sourceHeight?: number
  ) {
    const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);

    if (!match || !sourceWidth || !sourceHeight) {
      return dataUrl;
    }

    const normalizedBuffer = await sharp(Buffer.from(match[2], "base64"))
      .resize(sourceWidth, sourceHeight, {
        fit: "fill",
      })
      .png()
      .toBuffer();

    return `data:image/png;base64,${normalizedBuffer.toString("base64")}`;
  }

  private async createStructuralGuideImage(
    sourceBuffer: Buffer,
    width: number,
    height: number
  ) {
    const edgeMask = await this.createStructuralEdgeMask(sourceBuffer, width, height);
    const cyanEdges = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 0, g: 255, b: 255 },
      },
    })
      .joinChannel(edgeMask)
      .png()
      .toBuffer();
    const whiteFrame = Buffer.from(
      `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="${width - 4}" height="${height - 4}" fill="none" stroke="white" stroke-width="4"/>
      </svg>`
    );

    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 7, g: 15, b: 25 },
      },
    })
      .composite([
        { input: cyanEdges, blend: "over" },
        { input: whiteFrame, blend: "over" },
      ])
      .png()
      .toBuffer();
  }

  private async createStructuralEdgeMask(
    sourceBuffer: Buffer,
    width: number,
    height: number
  ) {
    return sharp(sourceBuffer)
      .resize(width, height, { fit: "fill" })
      .grayscale()
      .blur(0.3)
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
      })
      .normalise()
      .threshold(38)
      .dilate(1)
      .png()
      .toBuffer();
  }

  private async writeDebugGenerationFiles(input: {
    sourceBuffer: Buffer;
    structuralGuideBuffer: Buffer;
    rawGeneratedDataUrl: string;
    normalizedDataUrl: string;
    sourceWidth: number;
    sourceHeight: number;
  }) {
    if (!env.ROOM_AI_DEBUG) {
      return;
    }

    const debugId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const debugDirectory = resolveMediaStoragePath("generated", "room-ai-debug", debugId);
    await mkdir(debugDirectory, { recursive: true });

    const rawBuffer = this.dataUrlToBuffer(input.rawGeneratedDataUrl);
    const normalizedBuffer = this.dataUrlToBuffer(input.normalizedDataUrl);
    const rawDiff = await this.calculateImageDiff(input.sourceBuffer, rawBuffer);
    const normalizedDiff = await this.calculateImageDiff(input.sourceBuffer, normalizedBuffer);

    await Promise.all([
      writeFile(path.join(debugDirectory, "01-source.png"), input.sourceBuffer),
      writeFile(path.join(debugDirectory, "02-structural-guide.png"), input.structuralGuideBuffer),
      writeFile(path.join(debugDirectory, "03-openai-raw.png"), rawBuffer),
      writeFile(path.join(debugDirectory, "04-final-normalized.png"), normalizedBuffer),
      writeFile(
        path.join(debugDirectory, "metrics.json"),
        JSON.stringify(
          {
            sourceWidth: input.sourceWidth,
            sourceHeight: input.sourceHeight,
            rawDiff,
            normalizedDiff,
          },
          null,
          2
        )
      ),
    ]);

    console.info(`[room-ai-debug] saved generation debug files: ${debugDirectory}`);
  }

  private dataUrlToBuffer(dataUrl: string) {
    const match = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);

    if (!match) {
      return Buffer.from([]);
    }

    return Buffer.from(match[1], "base64");
  }

  private async calculateImageDiff(sourceBuffer: Buffer, generatedBuffer: Buffer) {
    const width = 512;
    const height = 384;
    const [sourceRaw, generatedRaw] = await Promise.all([
      sharp(sourceBuffer).resize(width, height, { fit: "fill" }).removeAlpha().raw().toBuffer(),
      sharp(generatedBuffer).resize(width, height, { fit: "fill" }).removeAlpha().raw().toBuffer(),
    ]);
    let absoluteSum = 0;
    let changedChannels = 0;
    let maxDelta = 0;

    for (let index = 0; index < sourceRaw.length; index += 1) {
      const delta = Math.abs(sourceRaw[index] - generatedRaw[index]);
      absoluteSum += delta;
      if (delta > 8) {
        changedChannels += 1;
      }
      maxDelta = Math.max(maxDelta, delta);
    }

    return {
      averageChannelDelta: Number((absoluteSum / sourceRaw.length).toFixed(3)),
      changedChannelPercent: Number(((changedChannels / sourceRaw.length) * 100).toFixed(3)),
      maxChannelDelta: maxDelta,
    };
  }

  private async createArchitectureRestoreMask(width: number, height: number) {
    const sideLock = Math.max(18, Math.round(width * 0.04));
    const topLock = Math.max(18, Math.round(height * 0.04));
    const bottomLock = Math.max(18, Math.round(height * 0.04));
    const maskSvg = Buffer.from(
      `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="black"/>
        <rect x="0" y="0" width="${width}" height="${topLock}" fill="white"/>
        <rect x="0" y="${height - bottomLock}" width="${width}" height="${bottomLock}" fill="white"/>
        <rect x="0" y="${topLock}" width="${sideLock}" height="${height - topLock - bottomLock}" fill="white"/>
        <rect x="${width - sideLock}" y="${topLock}" width="${sideLock}" height="${height - topLock - bottomLock}" fill="white"/>
      </svg>`
    );

    return sharp(maskSvg).greyscale().png().toBuffer();
  }

  async refineVariantFromPhoto(
    input: RefineVariantFromPhotoInput
  ): Promise<Pick<RoomVariant, "furniture" | "openings" | "description">> {
    const prompt = this.buildPlanFromPhotoPrompt(input);
    const originalImageInputs = await this.createImageInputs(input.originalPhotos.slice(0, 1));

    const response = await this.client.responses.create({
      model: env.OPENAI_VISION_MODEL,
      text: { format: { type: "json_object" } },
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
      const cleaned = this.extractJsonText(rawText);

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
    } catch (error) {
      throw new Error(
        `Failed to parse OpenAI room analysis: ${
          error instanceof Error ? error.message : String(error)
        }. Raw: ${rawText}`
      );
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
      const cleaned = this.extractJsonText(rawText);

      const parsed = JSON.parse(cleaned) as { variants?: RoomVariant[] };

      if (!Array.isArray(parsed.variants)) {
        throw new Error("Missing variants array.");
      }

      return parsed.variants.slice(0, 1).map((variant, index) => {
        const variantNumber = index + 1;

        return {
          id: variant.id || `variant_${variantNumber}`,
          title: variant.title || `Ð’Ð°Ñ€Ð¸Ð°Ð½Ñ‚ ${variantNumber}`,
          description: variant.description || "Ð’Ð°Ñ€Ð¸Ð°Ð½Ñ‚ Ñ€Ð°ÑÑÑ‚Ð°Ð½Ð¾Ð²ÐºÐ¸ Ð¼ÐµÐ±ÐµÐ»Ð¸.",
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
                label: item.label || `ÐœÐµÐ±ÐµÐ»ÑŒ ${itemIndex + 1}`,
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
      const cleaned = this.extractJsonText(rawText);

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
              label: item.label || `ÐœÐµÐ±ÐµÐ»ÑŒ ${itemIndex + 1}`,
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

  private extractJsonText(rawText: string) {
    const cleaned = rawText
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
      return cleaned;
    }

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start >= 0 && end > start) {
      return cleaned.slice(start, end + 1);
    }

    return cleaned;
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
    const detectedOpenings = params.roomAnalysis.openings ?? [];
    const openingsList = detectedOpenings.length > 0
      ? detectedOpenings
          .map(
            (opening) =>
              `- ${opening.id}: ${opening.type}, wall=${opening.wall}, offsetM=${opening.offsetM}, widthM=${opening.widthM}, hinge=${opening.hinge ?? "none"}, swing=${opening.swing ?? "none"}`
          )
          .join("\n")
      : "- openings were not confidently detected; preserve every real visible door, window, doorway, and opening exactly as shown in the source photo";
    const furnitureList = params.variant.furniture
      .map(
        (item) =>
          `- ${item.label} (${item.type}), x=${item.xM}, y=${item.yM}, width=${item.widthM}, depth=${item.depthM}, rotation=${item.rotationDeg}`
      )
      .join("\n");

    return `
Transform the source photo into a finished, furnished real-estate interior.

You will receive two input images:
1. SOURCE PHOTO: the actual room to transform.
2. GEOMETRY GUIDE: a cyan-line drawing of the room structure.

Use the SOURCE PHOTO as the base image.
Use the GEOMETRY GUIDE only to keep the room shape aligned.
Do not show the cyan guide lines in the final image.

Main task:
- Make the room look renovated, clean, warm, and ready to live in.
- Add visible furniture and styling. The room must not stay empty.
- Change the visual design noticeably: fresh wall finish, improved floor/ceiling finish where appropriate, lighting, textiles, decor, and realistic furniture.
- Remove construction clutter, dirt, stains, loose debris, and visual noise.
- Produce a photorealistic final image, not a sketch and not a plan.

Room type: ${params.roomType}
Design concept: ${params.variant.title}
Design notes: ${params.variant.description}
Palette: ${params.variant.palette?.join(", ") || "neutral, bright, natural"}

Furniture to add:
${furnitureList || "- Add a complete, believable furniture set for this room type."}

Practical constraints:
${params.roomAnalysis.constraints.join("\n") || "- Keep normal circulation paths and access to doors and windows."}

Fixed openings detected in the room:
${openingsList}

Opening lock:
- Treat every visible door, doorless doorway, window, frame, sill, threshold, reveal, jamb, lintel, and dark/open passage as permanent architecture.
- Preserve each opening from the SOURCE PHOTO with the same wall, same left/right offset, same visible width, same height, same top edge, same bottom edge, and same distance to the nearest corners and wall seams.
- Empty doorways must remain empty doorways. Do not fill them with wall, paint, cabinets, curtains, mirrors, art, panels, shelves, plants, or furniture.
- Doors must remain recognizable as doors. Windows must remain recognizable as windows. Open passages must remain recognizable as open passages.
- Furniture and decor may be added only in areas that do not cover, erase, shrink, simplify, or move any opening.
- If an opening is partly damaged, dark, unfinished, or visually noisy in the source photo, repair its finish but keep its exact aperture and outline.
- If the source photo has more than one door/opening, the final image must keep the same count of doors/openings.

Geometry rule:
Keep the room as the same room. Preserve the camera viewpoint, crop, perspective, room perimeter, corners, wall/floor joints, wall/ceiling joints, ceiling outline, door outlines, window outlines, and opening positions. Doors and windows must remain in the same places and with the same sizes.

Important balance:
- The architecture stays fixed.
- The interior finish and furnishing must change clearly.
- Walls may be repainted.
- Floor may be cleaned/refinished or visually replaced.
- Ceiling surface may be refreshed, but its outline and slope/shape must stay the same.
- Furniture and decor may occupy the room, but must not erase or move doors/windows.
- Wall finish may change around an opening, but never across the opening itself.

Success criteria:
- The result is obviously furnished and renovated.
- The result still matches the source photo geometry.
- The final image preserves every source door, window, doorway, and open passage as a visible architectural opening.
- No text, captions, floor-plan lines, watermarks, or cyan guide lines.
- One final photorealistic interior image.
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
Ð¢Ñ‹ Ð°Ð½Ð°Ð»Ð¸Ð·Ð¸Ñ€ÑƒÐµÑˆÑŒ Ð¸Ð½Ñ‚ÐµÑ€ÑŒÐµÑ€Ð½Ð¾Ðµ Ñ„Ð¾Ñ‚Ð¾ Ð¸ ÑÑ‚Ñ€Ð¾Ð¸ÑˆÑŒ Ð¿Ð¾ Ð½ÐµÐ¼Ñƒ Ñ€ÐµÐ°Ð»Ð¸ÑÑ‚Ð¸Ñ‡Ð½Ñ‹Ð¹ Ð¿Ð»Ð°Ð½ ÑÐ²ÐµÑ€Ñ…Ñƒ.

Ð¢ÐµÐ±Ðµ Ð¿ÐµÑ€ÐµÐ´Ð°Ð½Ñ‹:
1. Ð¸ÑÑ…Ð¾Ð´Ð½Ð¾Ðµ Ñ„Ð¾Ñ‚Ð¾ Ð¿ÑƒÑÑ‚Ð¾Ð¹ ÐºÐ¾Ð¼Ð½Ð°Ñ‚Ñ‹;
2. ÑÐ³ÐµÐ½ÐµÑ€Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð½Ð¾Ðµ Ñ„Ð¾Ñ‚Ð¾ ÑÑ‚Ð¾Ð¹ Ð¶Ðµ ÐºÐ¾Ð¼Ð½Ð°Ñ‚Ñ‹ Ñ Ð¼ÐµÐ±ÐµÐ»ÑŒÑŽ.

ÐÑƒÐ¶Ð½Ð¾ Ð²ÐµÑ€Ð½ÑƒÑ‚ÑŒ Ð¸ÑÐ¿Ñ€Ð°Ð²Ð»ÐµÐ½Ð½Ñ‹Ð¹ JSON Ð´Ð»Ñ Ð¿Ð»Ð°Ð½Ð° Ñ€Ð°ÑÑÑ‚Ð°Ð½Ð¾Ð²ÐºÐ¸, Ð¾Ð¿Ð¸Ñ€Ð°ÑÑÑŒ Ð² Ð¿ÐµÑ€Ð²ÑƒÑŽ Ð¾Ñ‡ÐµÑ€ÐµÐ´ÑŒ Ð½Ð° Ñ„Ð¾Ñ‚Ð¾ Ñ Ð¼ÐµÐ±ÐµÐ»ÑŒÑŽ, Ð½Ð¾ ÑÐ²ÐµÑ€ÑÑ Ð°Ñ€Ñ…Ð¸Ñ‚ÐµÐºÑ‚ÑƒÑ€Ñƒ Ñ Ð¸ÑÑ…Ð¾Ð´Ð½Ð¾Ð¹ ÐºÐ¾Ð¼Ð½Ð°Ñ‚Ð¾Ð¹.

Ð¢Ð¸Ð¿ ÐºÐ¾Ð¼Ð½Ð°Ñ‚Ñ‹: ${input.roomType}
Ð¨Ð¸Ñ€Ð¸Ð½Ð° ÐºÐ¾Ð¼Ð½Ð°Ñ‚Ñ‹: ${widthM ?? "Ð½ÐµÐ¸Ð·Ð²ÐµÑÑ‚Ð½Ð¾"} Ð¼
Ð”Ð»Ð¸Ð½Ð° ÐºÐ¾Ð¼Ð½Ð°Ñ‚Ñ‹: ${lengthM ?? "Ð½ÐµÐ¸Ð·Ð²ÐµÑÑ‚Ð½Ð¾"} Ð¼
Ð¢ÐµÐºÑƒÑ‰Ð¸Ð¹ Ð²Ð°Ñ€Ð¸Ð°Ð½Ñ‚: ${input.variant.title}
Ð¢ÐµÐºÑƒÑ‰ÐµÐµ Ð¾Ð¿Ð¸ÑÐ°Ð½Ð¸Ðµ: ${input.variant.description}

ÐžÐ³Ñ€Ð°Ð½Ð¸Ñ‡ÐµÐ½Ð¸Ñ Ð¸ ÐºÐ¾Ð½Ñ‚ÐµÐºÑÑ‚:
${input.roomAnalysis.constraints.join("\n")}

ARCHITECTURE LOCK:
${JSON.stringify(input.roomAnalysis.openings, null, 2)}

The original empty room is the source of truth for architecture.
Keep every real door, second door, doorway, window, frame, trim, sill, and threshold from the original room in the same wall, same relative offset, same visible width, same height, same top/bottom edge, same sill/threshold position, and same distance to corners and other openings.
Do not let the generated furnished photo override or simplify the architecture.
Do not center, mirror, remove, hide, cover, resize, simplify, or relocate openings even if the generated image appears to do so.
If generated furniture hides a door/window, infer the opening from the original photo and keep it in the returned JSON.
If the original photo has two doors/openings, the returned JSON must keep both separately.

ÐšÑ€Ð¸Ñ‚Ð¸Ñ‡ÐµÑÐºÐ¸ Ð²Ð°Ð¶Ð½Ð¾:
- Ð½Ðµ Ð¿Ñ€Ð¸Ð´ÑƒÐ¼Ñ‹Ð²Ð°Ð¹ Ð´Ñ€ÑƒÐ³ÑƒÑŽ Ð°Ñ€Ñ…Ð¸Ñ‚ÐµÐºÑ‚ÑƒÑ€Ñƒ ÐºÐ¾Ð¼Ð½Ð°Ñ‚Ñ‹;
- Ð¾ÐºÐ½Ð¾ Ð¸ Ð´Ð²ÐµÑ€ÑŒ Ð´Ð¾Ð»Ð¶Ð½Ñ‹ Ð¾ÑÑ‚Ð°Ñ‚ÑŒÑÑ Ð½Ð° ÑÐ²Ð¾Ð¸Ñ… Ñ€ÐµÐ°Ð»ÑŒÐ½Ñ‹Ñ… Ð¼ÐµÑÑ‚Ð°Ñ…;
- ÑÐ¾Ð±Ð»ÑŽÐ´Ð°Ð¹ Ð¿Ñ€Ð¾Ð¿Ð¾Ñ€Ñ†Ð¸Ð¸ Ð¿Ñ€Ð¾Ñ‘Ð¼Ð¾Ð² Ð¾Ñ‚Ð½Ð¾ÑÐ¸Ñ‚ÐµÐ»ÑŒÐ½Ð¾ ÑÑ‚ÐµÐ½Ñ‹;
- Ð¾ÑÐ¾Ð±ÐµÐ½Ð½Ð¾ Ð²Ð°Ð¶Ð½Ð¾ ÑÐ¾Ñ…Ñ€Ð°Ð½Ð¸Ñ‚ÑŒ Ñ€Ð°ÑÑÑ‚Ð¾ÑÐ½Ð¸Ñ Ð¾Ñ‚ Ð¾ÐºÐ½Ð° Ð´Ð¾ Ð»ÐµÐ²Ð¾Ð³Ð¾ Ð¸ Ð¿Ñ€Ð°Ð²Ð¾Ð³Ð¾ ÑƒÐ³Ð»Ð¾Ð² ÑÑ‚ÐµÐ½Ñ‹ Ñ‚Ð°ÐºÐ¸Ð¼Ð¸, ÐºÐ°ÐºÐ¸Ð¼Ð¸ Ð¾Ð½Ð¸ Ð²Ñ‹Ð³Ð»ÑÐ´ÑÑ‚ Ð½Ð° Ð¸ÑÑ…Ð¾Ð´Ð½Ð¾Ð¹ Ñ„Ð¾Ñ‚Ð¾Ð³Ñ€Ð°Ñ„Ð¸Ð¸;
- ÐµÑÐ»Ð¸ Ð¾ÐºÐ½Ð¾ Ð²Ð¸Ð·ÑƒÐ°Ð»ÑŒÐ½Ð¾ ÑÐ¼ÐµÑ‰ÐµÐ½Ð¾ Ðº Ð¾Ð´Ð½Ð¾Ð¹ ÑÑ‚Ð¾Ñ€Ð¾Ð½Ðµ ÑÑ‚ÐµÐ½Ñ‹, ÑÑ‚Ð¾ ÑÐ¼ÐµÑ‰ÐµÐ½Ð¸Ðµ Ð´Ð¾Ð»Ð¶Ð½Ð¾ Ñ‡Ð¸Ñ‚Ð°Ñ‚ÑŒÑÑ Ð¸ Ð½Ð° Ð¿Ð»Ð°Ð½Ðµ;
- Ñ†ÐµÐ½Ñ‚Ñ€ ÐºÐ¾Ð¼Ð½Ð°Ñ‚Ñ‹ Ð¸ Ð¿Ñ€Ð¾Ñ…Ð¾Ð´ Ðº Ð¾ÐºÐ½Ñƒ Ð´Ð¾Ð»Ð¶Ð½Ñ‹ ÑÐ¾Ð¾Ñ‚Ð²ÐµÑ‚ÑÑ‚Ð²Ð¾Ð²Ð°Ñ‚ÑŒ Ñ„Ð¾Ñ‚Ð¾;
- Ð¼ÐµÐ±ÐµÐ»ÑŒ ÑÑ‚Ð°Ð²ÑŒ Ñ‚Ð°Ðº, ÐºÐ°Ðº Ð¾Ð½Ð° Ð²Ñ‹Ð³Ð»ÑÐ´Ð¸Ñ‚ Ð½Ð° Ñ„Ð¾Ñ‚Ð¾ Ñ Ð¼ÐµÐ±ÐµÐ»ÑŒÑŽ, Ð° Ð½Ðµ Ð¿Ð¾ ÑÑ‚Ð°Ñ€Ð¾Ð¼Ñƒ Ð¿Ð»Ð°Ð½Ñƒ;
- Ð½Ðµ Ð²Ñ‹Ñ€Ð°Ð²Ð½Ð¸Ð²Ð°Ð¹ Ð°Ð²Ñ‚Ð¾Ð¼Ð°Ñ‚Ð¸Ñ‡ÐµÑÐºÐ¸ Ð¾ÐºÐ½Ð¾ Ð¿Ð¾ Ñ†ÐµÐ½Ñ‚Ñ€Ñƒ ÑÑ‚ÐµÐ½Ñ‹, ÐµÑÐ»Ð¸ Ð½Ð° Ñ„Ð¾Ñ‚Ð¾ Ð¾Ð½Ð¾ Ð½Ðµ Ð¿Ð¾ Ñ†ÐµÐ½Ñ‚Ñ€Ñƒ;
- Ð½Ðµ Ð´Ð¾Ð±Ð°Ð²Ð»ÑÐ¹ Ð»Ð¸ÑˆÐ½ÑŽÑŽ Ð¼ÐµÐ±ÐµÐ»ÑŒ, ÐºÐ¾Ñ‚Ð¾Ñ€Ð¾Ð¹ Ð½ÐµÑ‚ Ð½Ð° Ñ„Ð¾Ñ‚Ð¾.

ÐžÑ‚Ð²ÐµÑ‚ Ð´Ð¾Ð»Ð¶ÐµÐ½ Ð±Ñ‹Ñ‚ÑŒ Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ð²Ð°Ð»Ð¸Ð´Ð½Ñ‹Ð¼ JSON Ð±ÐµÐ· markdown.

Ð’ÐµÑ€Ð½Ð¸ JSON ÑÑ‚Ñ€Ð¾Ð³Ð¾ Ð² ÑÑ‚Ð¾Ð¹ Ñ„Ð¾Ñ€Ð¼Ðµ:
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

