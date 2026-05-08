import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
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

    return {
      ...usage,
      estimatedCostUsd,
      note:
        "Оценка: текстовые токены взяты из usage, стоимость изображения рассчитана по текущему прайсу для 1536x1024 medium.",
    };
  }

  private getImageUnitCostUsd(model: string) {
    if (model.includes("gpt-image-1-mini")) {
      return 0.015;
    }

    return 0.063;
  }

  private estimateTextCostUsd(
    model: string,
    usage: { inputTokens: number; outputTokens: number }
  ) {
    const rates = model.includes("gpt-5.4-mini")
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
    const storageDirectory = path.resolve(process.cwd(), env.ROOM_AI_STORAGE_PATH);

    await mkdir(storageDirectory, { recursive: true });
    await writeFile(path.join(storageDirectory, safeFileName), Buffer.from(base64, "base64"));

    return `/generated/${safeFileName}`;
  }

  private async generatePhotosForVariants(
    input: GenerateRoomDesignInput,
    roomAnalysis: RoomAnalysis,
    variants: RoomVariant[]
  ): Promise<RoomVariant[]> {
    return Promise.all(
      variants.map(async (variant, index) => {
        try {
          const photoImageUrl = await this.ai.generateVariantPhoto({
            photos: input.photos,
            roomType: input.roomType,
            roomAnalysis,
            variant,
          });

          return {
            ...variant,
            photoImageUrl,
          };
        } catch (error) {
          throwIfRoomAiUserError(error);
          console.error("OpenAI photo generation failed:", error);

          return {
            ...variant,
            photoImageUrl:
              variant.photoImageUrl || `/generated/mock-photo-${(index % 3) + 1}.svg`,
          };
        }
      })
    );
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
        detectedObjects: ["стены", "пол", "окно", "дверь"],
        removableObjects: ["временные предметы"],
        fixedElements: ["окно", "дверь"],
        constraints: [
          "Не перекрывать открывание двери",
          "Сохранить доступ к окну",
          "Оставить проходы",
        ],
        notes: [
          "Использован резервный mock-анализ, потому что OpenAI не вернул корректный результат.",
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
            label: "дверь",
          },
          {
            id: "window_fallback",
            type: "window",
            wall: "bottom",
            offsetM: Math.max(0.6, widthM / 2 - 0.7),
            widthM: Math.min(1.6, Math.max(0.8, widthM - 1.2)),
            label: "окно",
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
        "Семейная кухня с мягким уголком",
        "Практичная кухня с хранением",
        "Кухня с ТВ-зоной",
      ],
      bedroom: [
        "Спальня с рабочим местом",
        "Спальня с большим хранением",
        "Минималистичная спальня",
      ],
      kids_room: [
        "Детская: сон + учёба",
        "Детская с игровой зоной",
        "Комната на вырост",
      ],
      office: [
        "Домашний офис с хранением",
        "Минималистичный кабинет",
        "Рабочая зона с местом отдыха",
      ],
      living_room: [
        "Гостиная с диваном и ТВ",
        "Гостиная с рабочим уголком",
        "Уютная гостиная для отдыха",
      ],
    };

    return titlesByType[roomType].map((title, index) => {
      const variantNumber = index + 1;

        return {
          id: `variant_${variantNumber}`,
          title,
          description:
            "Тестовый вариант расстановки. Если OpenAI недоступен, используется резервный вариант.",
          photoImageUrl: `/generated/mock-photo-${variantNumber}.svg`,
          planImageUrl: `/generated/mock-plan-${variantNumber}.svg`,
          layoutSource: "mock",
          palette: this.getMockPalette(variantNumber),
          pros: ["Понятная композиция", "Базовая эргономика"],
          cons: ["Это резервный вариант", "Нужна ручная проверка"],
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
      kitchen: ["Мягкий уголок", "Обеденный стол", "ТВ-зона", "Холодильник"],
      bedroom: ["Кровать", "Рабочий стол", "Шкаф", "Тумба"],
      kids_room: ["Кровать", "Учебный стол", "Стеллаж", "Игровая зона"],
      office: ["Рабочий стол", "Кресло", "Шкаф", "Зона отдыха"],
      living_room: ["Диван", "ТВ-тумба", "Журнальный стол", "Стеллаж"],
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
        label: "дверь",
      },
      {
        id: "window_fallback",
        type: "window",
        wall: "bottom",
        offsetM: Math.max(0.6, roomWidthM / 2 - 0.7),
        widthM: Math.min(1.6, Math.max(0.8, roomWidthM - 1.2)),
        label: "окно",
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

    if (/(кров|bed|диван|sofa|шкаф|wardrobe|dresser|комод|tv|тумба|shelf|стеллаж)/.test(kind)) {
      return nearestWallGap * 0.9 + Math.max(0, 1.2 - centerDistance) * 1.8;
    }

    if (/(desk|table|стол|рабоч)/.test(kind)) {
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
