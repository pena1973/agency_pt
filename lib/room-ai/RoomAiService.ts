import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { getMediaPublicUrl, resolveMediaStoragePath } from "@/lib/media/storage";
import { throwIfRoomAiUserError } from "@/lib/room-ai/errors";
import { OpenAiRoomProvider } from "@/lib/room-ai/providers/OpenAiRoomProvider";
import { env } from "@/lib/room-ai/utils/env";
import type {
  FurnitureItem,
  GenerateRoomDesignResult,
  RoomAnalysis,
  RoomDimensions,
  RoomOpening,
  RoomStyle,
  RoomType,
  RoomVariant,
} from "./types";

const ROOM_AI_FALLBACK_IMAGE_URL = "/mock/property-placeholder.svg";

type GenerateRoomDesignInput = {
  photos: File[];
  roomType: RoomType;
  roomDimensions?: RoomDimensions;
  peopleCount?: number;
  style?: RoomStyle;
};

export class RoomAiService {
  private ai = new OpenAiRoomProvider();

  async generateRoomDesign(
    input: GenerateRoomDesignInput
  ): Promise<GenerateRoomDesignResult> {
    const jobId = randomUUID();

    const roomAnalysis = await this.getRoomAnalysis(input);
    const variants = this.sanitizeVariants(
      input,
      roomAnalysis,
      await this.getLayoutVariants(input, roomAnalysis)
    ).slice(0, 1);

    const variantsWithImages = await this.generatePhotosForVariants(
      input,
      roomAnalysis,
      variants
    );

    const photoAlignedVariants = this.sanitizeVariants(
      input,
      roomAnalysis,
      await this.refineVariantsFromGeneratedPhotos(
        input,
        roomAnalysis,
        variantsWithImages
      )
    );

    const usageEstimate = this.buildUsageEstimate();

    return {
      jobId,
      roomAnalysis,
      variants: await this.persistGeneratedVariantPhotos(jobId, photoAlignedVariants),
      usageEstimate,
    };
  }

  private buildUsageEstimate(): GenerateRoomDesignResult["usageEstimate"] {
    const usage = this.ai.getUsage();
    const imageUnitCostUsd = this.getImageUnitCostUsd(env.OPENAI_IMAGE_MODEL);
    const textCostUsd = this.estimateTextCostUsd(env.OPENAI_VISION_MODEL, usage);
    const estimatedCostUsd =
      textCostUsd + usage.generatedImages * imageUnitCostUsd;
    const estimatedCostEur = estimatedCostUsd * env.ROOM_AI_USD_TO_EUR_RATE;

    return {
      ...usage,
      estimatedCostUsd,
      estimatedCostEur,
      note:
        `Оценка: текстовые токены взяты из usage, изображение считается по high quality для ${env.OPENAI_IMAGE_MODEL}; курс USD/EUR: ${env.ROOM_AI_USD_TO_EUR_RATE}. Фактическое списание OpenAI и банковская конвертация могут отличаться.`,
    };
  }

  private getImageUnitCostUsd(model: string) {
    if (model.includes("gpt-image-1-mini")) {
      return 0.052;
    }

    if (model.includes("gpt-image-1.5") || model.includes("chatgpt-image-latest")) {
      return 0.2;
    }

    return 0.25;
  }

  private estimateTextCostUsd(
    model: string,
    usage: { inputTokens: number; outputTokens: number }
  ) {
    const rates =
      model.includes("gpt-5.1-mini") ||
      model.includes("gpt-5-mini") ||
      model.includes("codex-mini")
        ? { input: 0.25, output: 2 }
        : model.includes("gpt-5.4-mini")
          ? { input: 0.75, output: 4.5 }
      : model.includes("gpt-5.4")
        ? { input: 2.5, output: 15 }
        : model.includes("gpt-5.5")
          ? { input: 5, output: 30 }
          : model.includes("gpt-5")
            ? { input: 1.25, output: 10 }
            : null;

    if (!rates) {
      return 0;
    }

    return (
      (usage.inputTokens / 1_000_000) * rates.input +
      (usage.outputTokens / 1_000_000) * rates.output
    );
  }

  private async persistGeneratedVariantPhotos(
    jobId: string,
    variants: RoomVariant[]
  ): Promise<RoomVariant[]> {
    return Promise.all(
      variants.slice(0, 1).map(async (variant, index) => {
        if (!variant.photoImageUrl.startsWith("data:image/")) {
          return variant;
        }

        const savedImageUrl = await this.saveDataImage(
          variant.photoImageUrl,
          `${jobId}-${variant.id || `variant-${index + 1}`}.png`
        );

        return {
          ...variant,
          photoImageUrl: savedImageUrl,
        };
      })
    );
  }

  private async saveDataImage(dataUrl: string, fileName: string) {
    const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);

    if (!match) {
      return dataUrl;
    }

    const extension = match[1] === "jpeg" ? "jpg" : match[1];
    const base64 = match[2];
    const safeFileName = fileName
      .replace(/\.[^.]+$/, `.${extension}`)
      .replace(/[^a-zA-Z0-9._-]/g, "-");
    const storageDirectory = resolveMediaStoragePath("generated", "room-ai");

    await mkdir(storageDirectory, { recursive: true });
    await writeFile(path.join(storageDirectory, safeFileName), Buffer.from(base64, "base64"));

    return getMediaPublicUrl("generated", "room-ai", safeFileName);
  }

  private async generatePhotosForVariants(
    input: GenerateRoomDesignInput,
    roomAnalysis: RoomAnalysis,
    variants: RoomVariant[]
  ): Promise<RoomVariant[]> {
    return Promise.all(
      variants.map(async (variant) => {
        try {
          const photoImageUrl = await this.ai.generateVariantPhoto({
            photos: input.photos,
            roomType: input.roomType,
            roomAnalysis,
            variant,
          });

          if (await this.isGeneratedImageSameAsSource(photoImageUrl, input.photos)) {
            throw new Error(
              "OpenAI returned an unchanged source photo instead of a renovated interior."
            );
          }

          return {
            ...variant,
            photoImageUrl,
          };
        } catch (error) {
          throwIfRoomAiUserError(error);
          console.error("OpenAI photo generation failed:", error);
          throw new Error(
            `OpenAI photo generation failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      })
    );
  }

  private async isGeneratedImageSameAsSource(dataUrl: string, sourcePhotos: File[]) {
    const generatedBuffer = this.dataUrlToBuffer(dataUrl);

    if (!generatedBuffer) {
      return false;
    }

    for (const sourcePhoto of sourcePhotos) {
      const sourceBuffer = Buffer.from(await sourcePhoto.arrayBuffer());
      const diff = await this.calculateImageDiff(sourceBuffer, generatedBuffer);

      if (diff.averageChannelDelta < 1 && diff.changedChannelPercent < 0.5) {
        return true;
      }
    }

    return false;
  }

  private dataUrlToBuffer(dataUrl: string) {
    const match = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);

    return match ? Buffer.from(match[1], "base64") : null;
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

    for (let index = 0; index < sourceRaw.length; index += 1) {
      const delta = Math.abs(sourceRaw[index] - generatedRaw[index]);
      absoluteSum += delta;
      if (delta > 8) {
        changedChannels += 1;
      }
    }

    return {
      averageChannelDelta: absoluteSum / sourceRaw.length,
      changedChannelPercent: (changedChannels / sourceRaw.length) * 100,
    };
  }

  private async getRoomAnalysis(
    input: GenerateRoomDesignInput
  ): Promise<RoomAnalysis> {
    try {
      return await this.ai.analyzeRoom({
        photos: input.photos,
        roomType: input.roomType,
        roomDimensions: input.roomDimensions,
        peopleCount: input.peopleCount,
        palette: input.style?.palette,
      });
    } catch (error) {
      throwIfRoomAiUserError(error);
      console.error("OpenAI room analysis failed:", error);

      const widthM = input.roomDimensions?.widthM ?? 3;
      const lengthM = input.roomDimensions?.lengthM ?? 3.5;
      const heightM = input.roomDimensions?.heightM ?? 2.6;

      return {
        estimatedDimensions: {
          widthM,
          lengthM,
          heightM,
          confidence:
            input.roomDimensions?.widthM && input.roomDimensions?.lengthM
              ? "high"
              : "low",
        },
        detectedObjects: ["walls", "floor", "ceiling", "visible doors", "visible windows"],
        removableObjects: ["temporary clutter", "loose construction debris"],
        fixedElements: ["room perimeter", "doors", "windows", "wall/floor/ceiling seams"],
        constraints: [
          "Preserve all visible doors and windows from the source photo.",
          "Keep wall/floor/ceiling seams and perspective unchanged.",
          "Keep practical walkways and access to openings.",
        ],
        notes: [
          "Fallback analysis was used because the model did not return parseable room-analysis JSON.",
        ],
        openings: [
          {
            id: "door_fallback",
            type: "door",
            wall: "left",
            offsetM: 0.25,
            widthM: 0.8,
            hinge: "start",
            swing: "in",
            label: "door",
          },
          {
            id: "window_fallback",
            type: "window",
            wall: "bottom",
            offsetM: Math.max(0.6, widthM / 2 - 0.7),
            widthM: Math.min(1.6, Math.max(0.8, widthM - 1.2)),
            label: "window",
          },
        ],
      };
    }
  }

  private async getLayoutVariants(
    input: GenerateRoomDesignInput,
    roomAnalysis: RoomAnalysis
  ): Promise<RoomVariant[]> {
    try {
      return (await this.ai.generateLayoutVariants({
        photos: input.photos,
        roomType: input.roomType,
        roomAnalysis,
        roomDimensions: input.roomDimensions,
        peopleCount: input.peopleCount,
        palette: input.style?.palette,
      })).slice(0, 1);
    } catch (error) {
      throwIfRoomAiUserError(error);
      console.error("OpenAI layout variants failed:", error);
      return this.createMockVariants(input.roomType).slice(0, 1);
    }
  }

  private async refineVariantsFromGeneratedPhotos(
    input: GenerateRoomDesignInput,
    roomAnalysis: RoomAnalysis,
    variants: RoomVariant[]
  ): Promise<RoomVariant[]> {
    return Promise.all(
      variants.map(async (variant) => {
        if (!variant.photoImageUrl.startsWith("data:image/")) {
          return variant;
        }

        try {
          const refined = await this.ai.refineVariantFromPhoto({
            originalPhotos: input.photos,
            generatedPhotoDataUrl: variant.photoImageUrl,
            roomType: input.roomType,
            roomAnalysis,
            roomDimensions: input.roomDimensions,
            variant,
          });

          return {
            ...variant,
            description: refined.description,
            openings: refined.openings,
            furniture: refined.furniture,
            layoutSource: "photo_refined",
          };
        } catch (error) {
          throwIfRoomAiUserError(error);
          console.error("OpenAI photo-to-plan refinement failed:", error);
          return variant;
        }
      })
    );
  }

  private createMockVariants(roomType: RoomType): RoomVariant[] {
    const titlesByType: Record<RoomType, string[]> = {
      kitchen: [
        "Ð¡ÐµÐ¼ÐµÐ¹Ð½Ð°Ñ ÐºÑƒÑ…Ð½Ñ Ñ Ð¼ÑÐ³ÐºÐ¸Ð¼ ÑƒÐ³Ð¾Ð»ÐºÐ¾Ð¼",
        "ÐŸÑ€Ð°ÐºÑ‚Ð¸Ñ‡Ð½Ð°Ñ ÐºÑƒÑ…Ð½Ñ Ñ Ñ…Ñ€Ð°Ð½ÐµÐ½Ð¸ÐµÐ¼",
        "ÐšÑƒÑ…Ð½Ñ Ñ Ð¢Ð’-Ð·Ð¾Ð½Ð¾Ð¹",
      ],
      bedroom: [
        "Ð¡Ð¿Ð°Ð»ÑŒÐ½Ñ Ñ Ñ€Ð°Ð±Ð¾Ñ‡Ð¸Ð¼ Ð¼ÐµÑÑ‚Ð¾Ð¼",
        "Ð¡Ð¿Ð°Ð»ÑŒÐ½Ñ Ñ Ð±Ð¾Ð»ÑŒÑˆÐ¸Ð¼ Ñ…Ñ€Ð°Ð½ÐµÐ½Ð¸ÐµÐ¼",
        "ÐœÐ¸Ð½Ð¸Ð¼Ð°Ð»Ð¸ÑÑ‚Ð¸Ñ‡Ð½Ð°Ñ ÑÐ¿Ð°Ð»ÑŒÐ½Ñ",
      ],
      kids_room: [
        "Ð”ÐµÑ‚ÑÐºÐ°Ñ: ÑÐ¾Ð½ + ÑƒÑ‡Ñ‘Ð±Ð°",
        "Ð”ÐµÑ‚ÑÐºÐ°Ñ Ñ Ð¸Ð³Ñ€Ð¾Ð²Ð¾Ð¹ Ð·Ð¾Ð½Ð¾Ð¹",
        "ÐšÐ¾Ð¼Ð½Ð°Ñ‚Ð° Ð½Ð° Ð²Ñ‹Ñ€Ð¾ÑÑ‚",
      ],
      office: [
        "Ð”Ð¾Ð¼Ð°ÑˆÐ½Ð¸Ð¹ Ð¾Ñ„Ð¸Ñ Ñ Ñ…Ñ€Ð°Ð½ÐµÐ½Ð¸ÐµÐ¼",
        "ÐœÐ¸Ð½Ð¸Ð¼Ð°Ð»Ð¸ÑÑ‚Ð¸Ñ‡Ð½Ñ‹Ð¹ ÐºÐ°Ð±Ð¸Ð½ÐµÑ‚",
        "Ð Ð°Ð±Ð¾Ñ‡Ð°Ñ Ð·Ð¾Ð½Ð° Ñ Ð¼ÐµÑÑ‚Ð¾Ð¼ Ð¾Ñ‚Ð´Ñ‹Ñ…Ð°",
      ],
      living_room: [
        "Ð“Ð¾ÑÑ‚Ð¸Ð½Ð°Ñ Ñ Ð´Ð¸Ð²Ð°Ð½Ð¾Ð¼ Ð¸ Ð¢Ð’",
        "Ð“Ð¾ÑÑ‚Ð¸Ð½Ð°Ñ Ñ Ñ€Ð°Ð±Ð¾Ñ‡Ð¸Ð¼ ÑƒÐ³Ð¾Ð»ÐºÐ¾Ð¼",
        "Ð£ÑŽÑ‚Ð½Ð°Ñ Ð³Ð¾ÑÑ‚Ð¸Ð½Ð°Ñ Ð´Ð»Ñ Ð¾Ñ‚Ð´Ñ‹Ñ…Ð°",
      ],
    };

    return titlesByType[roomType].map((title, index) => {
      const variantNumber = index + 1;

        return {
          id: `variant_${variantNumber}`,
          title,
          description:
            "Ð¢ÐµÑÑ‚Ð¾Ð²Ñ‹Ð¹ Ð²Ð°Ñ€Ð¸Ð°Ð½Ñ‚ Ñ€Ð°ÑÑÑ‚Ð°Ð½Ð¾Ð²ÐºÐ¸. Ð•ÑÐ»Ð¸ OpenAI Ð½ÐµÐ´Ð¾ÑÑ‚ÑƒÐ¿ÐµÐ½, Ð¸ÑÐ¿Ð¾Ð»ÑŒÐ·ÑƒÐµÑ‚ÑÑ Ñ€ÐµÐ·ÐµÑ€Ð²Ð½Ñ‹Ð¹ Ð²Ð°Ñ€Ð¸Ð°Ð½Ñ‚.",
          photoImageUrl: ROOM_AI_FALLBACK_IMAGE_URL,
          planImageUrl: ROOM_AI_FALLBACK_IMAGE_URL,
          layoutSource: "mock",
          palette: this.getMockPalette(variantNumber),
          pros: ["ÐŸÐ¾Ð½ÑÑ‚Ð½Ð°Ñ ÐºÐ¾Ð¼Ð¿Ð¾Ð·Ð¸Ñ†Ð¸Ñ", "Ð‘Ð°Ð·Ð¾Ð²Ð°Ñ ÑÑ€Ð³Ð¾Ð½Ð¾Ð¼Ð¸ÐºÐ°"],
          cons: ["Ð­Ñ‚Ð¾ Ñ€ÐµÐ·ÐµÑ€Ð²Ð½Ñ‹Ð¹ Ð²Ð°Ñ€Ð¸Ð°Ð½Ñ‚", "ÐÑƒÐ¶Ð½Ð° Ñ€ÑƒÑ‡Ð½Ð°Ñ Ð¿Ñ€Ð¾Ð²ÐµÑ€ÐºÐ°"],
          furniture: this.createMockFurniture(roomType, variantNumber),
      };
    });
  }

  private getMockPalette(variantNumber: number) {
    if (variantNumber === 1) return ["#dbe4f0", "#bfc8d4", "#d6c29b"];
    if (variantNumber === 2) return ["#fff7ed", "#fed7aa", "#fb923c"];
    return ["#f0fdf4", "#bbf7d0", "#4ade80"];
  }

  private createMockFurniture(roomType: RoomType, variantNumber: number) {
    const furnitureByType: Record<RoomType, string[]> = {
      kitchen: ["ÐœÑÐ³ÐºÐ¸Ð¹ ÑƒÐ³Ð¾Ð»Ð¾Ðº", "ÐžÐ±ÐµÐ´ÐµÐ½Ð½Ñ‹Ð¹ ÑÑ‚Ð¾Ð»", "Ð¢Ð’-Ð·Ð¾Ð½Ð°", "Ð¥Ð¾Ð»Ð¾Ð´Ð¸Ð»ÑŒÐ½Ð¸Ðº"],
      bedroom: ["ÐšÑ€Ð¾Ð²Ð°Ñ‚ÑŒ", "Ð Ð°Ð±Ð¾Ñ‡Ð¸Ð¹ ÑÑ‚Ð¾Ð»", "Ð¨ÐºÐ°Ñ„", "Ð¢ÑƒÐ¼Ð±Ð°"],
      kids_room: ["ÐšÑ€Ð¾Ð²Ð°Ñ‚ÑŒ", "Ð£Ñ‡ÐµÐ±Ð½Ñ‹Ð¹ ÑÑ‚Ð¾Ð»", "Ð¡Ñ‚ÐµÐ»Ð»Ð°Ð¶", "Ð˜Ð³Ñ€Ð¾Ð²Ð°Ñ Ð·Ð¾Ð½Ð°"],
      office: ["Ð Ð°Ð±Ð¾Ñ‡Ð¸Ð¹ ÑÑ‚Ð¾Ð»", "ÐšÑ€ÐµÑÐ»Ð¾", "Ð¨ÐºÐ°Ñ„", "Ð—Ð¾Ð½Ð° Ð¾Ñ‚Ð´Ñ‹Ñ…Ð°"],
      living_room: ["Ð”Ð¸Ð²Ð°Ð½", "Ð¢Ð’-Ñ‚ÑƒÐ¼Ð±Ð°", "Ð–ÑƒÑ€Ð½Ð°Ð»ÑŒÐ½Ñ‹Ð¹ ÑÑ‚Ð¾Ð»", "Ð¡Ñ‚ÐµÐ»Ð»Ð°Ð¶"],
    };

    return furnitureByType[roomType].map((label, index) => ({
      id: `variant_${variantNumber}_furniture_${index + 1}`,
      type: label.toLowerCase(),
      label,
      xM: 0.4 + index * 0.35,
      yM: 0.5 + index * 0.45,
      widthM: index === 0 ? 1.8 : 0.8,
      depthM: index === 0 ? 0.9 : 0.6,
      rotationDeg: index % 2 === 0 ? 0 : 90,
    }));
  }

  private sanitizeVariants(
    input: GenerateRoomDesignInput,
    roomAnalysis: RoomAnalysis,
    variants: RoomVariant[]
  ): RoomVariant[] {
    const roomWidthM = input.roomDimensions?.widthM ?? roomAnalysis.estimatedDimensions.widthM ?? 4;
    const roomLengthM =
      input.roomDimensions?.lengthM ?? roomAnalysis.estimatedDimensions.lengthM ?? 5;

    return variants.map((variant) => {
      const openings = this.resolveOpenings(variant, roomAnalysis, roomWidthM, roomLengthM);
      const furniture = this.sanitizeFurniture(
        variant.furniture,
        roomWidthM,
        roomLengthM,
        openings
      );

      return {
        ...variant,
        openings,
        furniture,
        layoutSource: variant.layoutSource ?? "ai",
      };
    });
  }

  private resolveOpenings(
    variant: RoomVariant,
    roomAnalysis: RoomAnalysis,
    roomWidthM: number,
    roomLengthM: number
  ): RoomOpening[] {
    const openings =
      variant.openings && variant.openings.length > 0
        ? variant.openings
        : roomAnalysis.openings ?? [];

    if (openings.length > 0) {
      return openings.map((opening) => {
        const wallLength =
          opening.wall === "top" || opening.wall === "bottom" ? roomWidthM : roomLengthM;

        const widthM = this.clamp(opening.widthM, 0.5, Math.max(0.5, wallLength));
        const offsetM = this.clamp(opening.offsetM, 0, Math.max(0, wallLength - widthM));

        return {
          ...opening,
          widthM,
          offsetM,
        };
      });
    }

    return [
      {
        id: "door_fallback",
        type: "door",
        wall: "left",
        offsetM: 0.25,
        widthM: 0.8,
        hinge: "start",
        swing: "in",
        label: "Ð´Ð²ÐµÑ€ÑŒ",
      },
      {
        id: "window_fallback",
        type: "window",
        wall: "bottom",
        offsetM: Math.max(0.6, roomWidthM / 2 - 0.7),
        widthM: Math.min(1.6, Math.max(0.8, roomWidthM - 1.2)),
        label: "Ð¾ÐºÐ½Ð¾",
      },
    ];
  }

  private sanitizeFurniture(
    items: FurnitureItem[],
    roomWidthM: number,
    roomLengthM: number,
    openings: RoomOpening[]
  ): FurnitureItem[] {
    const blockedZones = this.buildBlockedZones(openings, roomWidthM, roomLengthM);
    const placed: Array<FurnitureItem & { footprintWidthM: number; footprintDepthM: number }> = [];

    const sorted = [...items].sort((a, b) => b.widthM * b.depthM - a.widthM * a.depthM);

    for (const item of sorted) {
      const normalized = this.normalizeFurnitureItem(item, roomWidthM, roomLengthM);
      const candidate = this.findSafeFurniturePlacement(
        normalized,
        roomWidthM,
        roomLengthM,
        blockedZones,
        placed
      );

      if (candidate) {
        placed.push(candidate);
      }
    }

    return placed.map((item) => ({
      id: item.id,
      type: item.type,
      label: item.label,
      xM: item.xM,
      yM: item.yM,
      widthM: item.widthM,
      depthM: item.depthM,
      rotationDeg: item.rotationDeg,
      color: item.color,
    }));
  }

  private normalizeFurnitureItem(
    item: FurnitureItem,
    roomWidthM: number,
    roomLengthM: number
  ) {
    const rotation = this.normalizeRotation(item.rotationDeg);
    const isRotated = rotation === 90 || rotation === 270;
    const footprintWidthM = this.clamp(
      isRotated ? item.depthM : item.widthM,
      0.35,
      roomWidthM
    );
    const footprintDepthM = this.clamp(
      isRotated ? item.widthM : item.depthM,
      0.35,
      roomLengthM
    );

    return {
      ...item,
      rotationDeg: rotation,
      widthM: isRotated ? footprintDepthM : footprintWidthM,
      depthM: isRotated ? footprintWidthM : footprintDepthM,
      xM: this.clamp(item.xM, 0, Math.max(0, roomWidthM - footprintWidthM)),
      yM: this.clamp(item.yM, 0, Math.max(0, roomLengthM - footprintDepthM)),
      footprintWidthM,
      footprintDepthM,
    };
  }

  private findSafeFurniturePlacement(
    item: FurnitureItem & { footprintWidthM: number; footprintDepthM: number },
    roomWidthM: number,
    roomLengthM: number,
    blockedZones: Array<{ xM: number; yM: number; widthM: number; depthM: number }>,
    placed: Array<FurnitureItem & { footprintWidthM: number; footprintDepthM: number }>
  ) {
    const maxX = Math.max(0, roomWidthM - item.footprintWidthM);
    const maxY = Math.max(0, roomLengthM - item.footprintDepthM);
    const step = 0.15;

    let best:
      | (FurnitureItem & {
          footprintWidthM: number;
          footprintDepthM: number;
          score: number;
        })
      | null = null;

    for (let y = 0; y <= maxY + 0.001; y += step) {
      for (let x = 0; x <= maxX + 0.001; x += step) {
        const candidate = {
          ...item,
          xM: this.roundTwo(x),
          yM: this.roundTwo(y),
        };

        const box = {
          xM: candidate.xM,
          yM: candidate.yM,
          widthM: candidate.footprintWidthM,
          depthM: candidate.footprintDepthM,
        };

        const intersectsBlocked = blockedZones.some((zone) =>
          this.boxesOverlap(box, zone, 0.05)
        );
        const intersectsFurniture = placed.some((placedItem) =>
          this.boxesOverlap(
            box,
            {
              xM: placedItem.xM,
              yM: placedItem.yM,
              widthM: placedItem.footprintWidthM,
              depthM: placedItem.footprintDepthM,
            },
            0.08
          )
        );

        if (intersectsBlocked || intersectsFurniture) {
          continue;
        }

        const score =
          Math.abs(candidate.xM - item.xM) +
          Math.abs(candidate.yM - item.yM) +
          this.getWallAffinityPenalty(candidate, roomWidthM, roomLengthM);

        if (!best || score < best.score) {
          best = {
            ...candidate,
            score,
          };
        }
      }
    }

    if (!best) {
      return null;
    }

    return {
      id: best.id,
      type: best.type,
      label: best.label,
      xM: best.xM,
      yM: best.yM,
      widthM: best.widthM,
      depthM: best.depthM,
      rotationDeg: best.rotationDeg,
      color: best.color,
      footprintWidthM: best.footprintWidthM,
      footprintDepthM: best.footprintDepthM,
    };
  }

  private buildBlockedZones(
    openings: RoomOpening[],
    roomWidthM: number,
    roomLengthM: number
  ) {
    return openings.map((opening) => {
      const clearance = opening.type === "door" ? 0.95 : 0.45;

      if (opening.wall === "top") {
        return {
          xM: opening.offsetM,
          yM: 0,
          widthM: opening.widthM,
          depthM: clearance,
        };
      }

      if (opening.wall === "bottom") {
        return {
          xM: opening.offsetM,
          yM: Math.max(0, roomLengthM - clearance),
          widthM: opening.widthM,
          depthM: clearance,
        };
      }

      if (opening.wall === "left") {
        return {
          xM: 0,
          yM: opening.offsetM,
          widthM: clearance,
          depthM: opening.widthM,
        };
      }

      return {
        xM: Math.max(0, roomWidthM - clearance),
        yM: opening.offsetM,
        widthM: clearance,
        depthM: opening.widthM,
      };
    });
  }

  private getWallAffinityPenalty(
    item: FurnitureItem & { footprintWidthM: number; footprintDepthM: number },
    roomWidthM: number,
    roomLengthM: number
  ) {
    const kind = `${item.type} ${item.label}`.toLowerCase();
    const leftGap = item.xM;
    const rightGap = roomWidthM - (item.xM + item.footprintWidthM);
    const topGap = item.yM;
    const bottomGap = roomLengthM - (item.yM + item.footprintDepthM);
    const nearestWallGap = Math.min(leftGap, rightGap, topGap, bottomGap);

    const centerX = item.xM + item.footprintWidthM / 2;
    const centerY = item.yM + item.footprintDepthM / 2;
    const centerDistance =
      Math.abs(centerX - roomWidthM / 2) + Math.abs(centerY - roomLengthM / 2);

    if (/(ÐºÑ€Ð¾Ð²|bed|Ð´Ð¸Ð²Ð°Ð½|sofa|ÑˆÐºÐ°Ñ„|wardrobe|dresser|ÐºÐ¾Ð¼Ð¾Ð´|tv|Ñ‚ÑƒÐ¼Ð±Ð°|shelf|ÑÑ‚ÐµÐ»Ð»Ð°Ð¶)/.test(kind)) {
      return nearestWallGap * 0.9 + Math.max(0, 1.2 - centerDistance) * 1.8;
    }

    if (/(desk|table|ÑÑ‚Ð¾Ð»|Ñ€Ð°Ð±Ð¾Ñ‡)/.test(kind)) {
      return nearestWallGap * 0.45 + Math.max(0, 0.7 - centerDistance) * 0.8;
    }

    return nearestWallGap * 0.15;
  }

  private boxesOverlap(
    a: { xM: number; yM: number; widthM: number; depthM: number },
    b: { xM: number; yM: number; widthM: number; depthM: number },
    padding = 0
  ) {
    return !(
      a.xM + a.widthM + padding <= b.xM ||
      b.xM + b.widthM + padding <= a.xM ||
      a.yM + a.depthM + padding <= b.yM ||
      b.yM + b.depthM + padding <= a.yM
    );
  }

  private normalizeRotation(rotationDeg: number) {
    const normalized = ((Math.round(rotationDeg / 90) * 90) % 360 + 360) % 360;
    return normalized as 0 | 90 | 180 | 270;
  }

  private clamp(value: number, min: number, max: number) {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, value));
  }

  private roundTwo(value: number) {
    return Math.round(value * 100) / 100;
  }
}

