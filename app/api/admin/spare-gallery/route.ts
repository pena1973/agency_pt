import { NextResponse } from "next/server";
import {
  deleteSpareGalleryItem,
  ensureSpareImageForProperty,
  readSpareGalleryForProperty,
} from "@/lib/db/spare-gallery";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId")?.trim();

    if (!propertyId) {
      return NextResponse.json({ error: "Не передан ID объекта." }, { status: 400 });
    }

    return NextResponse.json({
      items: await readSpareGalleryForProperty(propertyId),
    });
  } catch {
    return NextResponse.json(
      { error: "Не удалось загрузить запасную галерею." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = (await request.json()) as { imageUrl?: string };

    if (!payload.imageUrl) {
      return NextResponse.json({ error: "Не передана фотография." }, { status: 400 });
    }

    await deleteSpareGalleryItem(payload.imageUrl);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Не удалось удалить фотографию из запасной галереи." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      propertyId?: string;
      imageUrl?: string;
    };

    if (!payload.propertyId || !payload.imageUrl) {
      return NextResponse.json(
        { error: "Не переданы объект или фотография." },
        { status: 400 }
      );
    }

    await ensureSpareImageForProperty(payload.propertyId, payload.imageUrl);

    return NextResponse.json({
      items: await readSpareGalleryForProperty(payload.propertyId),
    });
  } catch {
    return NextResponse.json(
      { error: "Не удалось перенести фотографию в запасную галерею." },
      { status: 500 }
    );
  }
}
