import { NextResponse } from "next/server";
import { RoomAiUserError } from "@/lib/room-ai/errors";
import { RoomAiService } from "@/lib/room-ai/RoomAiService";
import type { RoomType } from "@/lib/room-ai/types";
import { env } from "@/lib/room-ai/utils/env";

export const runtime = "nodejs";

function toNumber(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string") return undefined;

  const normalized = value.replace(",", ".").trim();

  if (!normalized) return undefined;

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function toRoomType(value: FormDataEntryValue | null): RoomType {
  if (typeof value !== "string") return "bedroom";

  const allowed: RoomType[] = [
    "kitchen",
    "bedroom",
    "kids_room",
    "office",
    "living_room",
  ];

  return allowed.includes(value as RoomType) ? (value as RoomType) : "bedroom";
}

function validatePhotos(photos: File[]) {
  if (photos.length === 0) {
    return "Нужно загрузить хотя бы одно фото помещения.";
  }

  if (photos.length > env.ROOM_AI_MAX_PHOTOS) {
    return `Можно загрузить максимум ${env.ROOM_AI_MAX_PHOTOS} фото.`;
  }

  const maxBytes = env.ROOM_AI_MAX_IMAGE_MB * 1024 * 1024;

  for (const photo of photos) {
    if (!photo.type.startsWith("image/")) {
      return `Файл ${photo.name} не является изображением.`;
    }

    if (photo.size > maxBytes) {
      return `Файл ${photo.name} слишком большой. Максимум ${env.ROOM_AI_MAX_IMAGE_MB} MB.`;
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const photos = formData
      .getAll("photos")
      .filter((item): item is File => item instanceof File);

    const validationError = validatePhotos(photos);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const roomType = toRoomType(formData.get("roomType"));
    const widthM = toNumber(formData.get("widthM"));
    const lengthM = toNumber(formData.get("lengthM"));
    const heightM = toNumber(formData.get("heightM"));
    const peopleCount = toNumber(formData.get("peopleCount"));
    const palette =
      typeof formData.get("palette") === "string"
        ? String(formData.get("palette"))
        : "light";

    const service = new RoomAiService();

    const result = await service.generateRoomDesign({
      photos,
      roomType,
      roomDimensions: {
        widthM,
        lengthM,
        heightM,
      },
      peopleCount,
      style: {
        palette: palette as never,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);

    if (error instanceof RoomAiUserError) {
      return NextResponse.json(
        {
          error: error.message,
          errorCode: error.code,
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: "Ошибка генерации вариантов комнаты." },
      { status: 500 }
    );
  }
}
