import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-access";
import { recordGenerationUsage } from "@/lib/db/generation-usage";
import {
  getMediaFilePathFromUrl,
  getMediaPublicUrl,
  resolveMediaStoragePath,
} from "@/lib/media/storage";

export const runtime = "nodejs";

type GifPayload = {
  startImageUrl?: string;
  finishImageUrl?: string;
  propertyId?: string;
  startFrame?: GifFrameSettings;
  finishFrame?: GifFrameSettings;
  startSeconds?: number;
  transitionSeconds?: number;
  finishSeconds?: number;
};

type GifFrameSettings = {
  scale?: number;
  x?: number;
  y?: number;
};

const OUTPUT_WIDTH = 720;
const OUTPUT_HEIGHT = 480;
const FPS = 8;

function clampSeconds(value: unknown, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0.2, Math.min(10, parsed));
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, parsed));
}

function normalizeFrameSettings(settings?: GifFrameSettings) {
  return {
    scale: clampNumber(settings?.scale, 1, 0.7, 2.5),
    x: clampNumber(settings?.x, 50, 0, 100),
    y: clampNumber(settings?.y, 50, 0, 100),
  };
}

async function readImageBuffer(imageUrl: string, requestUrl: string) {
  const publicFilePath = getMediaFilePathFromUrl(imageUrl);

  if (publicFilePath) {
    return readFile(publicFilePath);
  }

  const absoluteUrl = new URL(imageUrl, requestUrl).toString();
  const response = await fetch(absoluteUrl);

  if (!response.ok) {
    throw new Error("Image fetch failed");
  }

  return Buffer.from(await response.arrayBuffer());
}

async function normalizeImage(image: Buffer, settings?: GifFrameSettings) {
  const frameSettings = normalizeFrameSettings(settings);
  const metadata = await sharp(image).metadata();
  const sourceWidth = metadata.width ?? OUTPUT_WIDTH;
  const sourceHeight = metadata.height ?? OUTPUT_HEIGHT;
  const coverScale =
    Math.max(OUTPUT_WIDTH / sourceWidth, OUTPUT_HEIGHT / sourceHeight) *
    frameSettings.scale;
  const resizedWidth = Math.max(1, Math.round(sourceWidth * coverScale));
  const resizedHeight = Math.max(1, Math.round(sourceHeight * coverScale));
  const left = Math.round((OUTPUT_WIDTH - resizedWidth) * (frameSettings.x / 100));
  const top = Math.round((OUTPUT_HEIGHT - resizedHeight) * (frameSettings.y / 100));
  const cropLeft = Math.max(0, -left);
  const cropTop = Math.max(0, -top);
  const compositeLeft = Math.max(0, left);
  const compositeTop = Math.max(0, top);
  const visibleWidth = Math.max(
    1,
    Math.min(resizedWidth - cropLeft, OUTPUT_WIDTH - compositeLeft)
  );
  const visibleHeight = Math.max(
    1,
    Math.min(resizedHeight - cropTop, OUTPUT_HEIGHT - compositeTop)
  );
  const resizedImage = await sharp(image)
    .resize(resizedWidth, resizedHeight, {
      fit: "fill",
    })
    .removeAlpha()
    .ensureAlpha()
    .toBuffer();
  const visibleImage =
    cropLeft > 0 ||
    cropTop > 0 ||
    visibleWidth < resizedWidth ||
    visibleHeight < resizedHeight
      ? await sharp(resizedImage)
          .extract({
            left: cropLeft,
            top: cropTop,
            width: visibleWidth,
            height: visibleHeight,
          })
          .toBuffer()
      : resizedImage;

  return sharp({
    create: {
      width: OUTPUT_WIDTH,
      height: OUTPUT_HEIGHT,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      {
        input: visibleImage,
        left: compositeLeft,
        top: compositeTop,
      },
    ])
    .removeAlpha()
    .ensureAlpha()
    .raw()
    .toBuffer();
}

function blendFrames(start: Buffer, finish: Buffer, progress: number) {
  const frame = Buffer.alloc(start.length);
  const inverse = 1 - progress;

  for (let index = 0; index < start.length; index += 4) {
    frame[index] = Math.round(start[index] * inverse + finish[index] * progress);
    frame[index + 1] = Math.round(start[index + 1] * inverse + finish[index + 1] * progress);
    frame[index + 2] = Math.round(start[index + 2] * inverse + finish[index + 2] * progress);
    frame[index + 3] = 255;
  }

  return frame;
}

function repeatedFrames(frame: Buffer, count: number) {
  return Array.from({ length: count }, () => frame);
}

export async function POST(request: Request) {
  try {
    const forbiddenResponse = await requireAdminApiAccess();
    if (forbiddenResponse) return forbiddenResponse;

    const payload = (await request.json()) as GifPayload;

    if (!payload.startImageUrl || !payload.finishImageUrl) {
      return NextResponse.json(
        { error: "Передайте стартовое и финальное фото." },
        { status: 400 }
      );
    }

    const startSeconds = clampSeconds(payload.startSeconds, 1);
    const transitionSeconds = clampSeconds(payload.transitionSeconds, 2);
    const finishSeconds = clampSeconds(payload.finishSeconds, 1);

    const [startImage, finishImage] = await Promise.all([
      readImageBuffer(payload.startImageUrl, request.url),
      readImageBuffer(payload.finishImageUrl, request.url),
    ]);
    const [startFrame, finishFrame] = await Promise.all([
      normalizeImage(startImage, payload.startFrame),
      normalizeImage(finishImage, payload.finishFrame),
    ]);

    const startFrameCount = Math.max(1, Math.round(startSeconds * FPS));
    const transitionFrameCount = Math.max(2, Math.round(transitionSeconds * FPS));
    const finishFrameCount = Math.max(1, Math.round(finishSeconds * FPS));
    const transitionFrames = Array.from({ length: transitionFrameCount }, (_, index) =>
      blendFrames(startFrame, finishFrame, index / (transitionFrameCount - 1))
    );
    const frames = [
      ...repeatedFrames(startFrame, startFrameCount),
      ...transitionFrames,
      ...repeatedFrames(finishFrame, finishFrameCount),
    ];

    const stackedFrames = Buffer.concat(frames);
    const gifBuffer = await sharp(stackedFrames, {
      raw: {
        width: OUTPUT_WIDTH,
        height: OUTPUT_HEIGHT * frames.length,
        channels: 4,
        pageHeight: OUTPUT_HEIGHT,
      } as sharp.CreateRaw,
      animated: true,
    })
      .gif({
        delay: Array.from({ length: frames.length }, () => Math.round(1000 / FPS)),
        loop: 0,
        effort: 7,
        colours: 128,
        dither: 0.75,
      })
      .toBuffer();

    const outputDirectory = resolveMediaStoragePath("generated", "gifs");
    await mkdir(outputDirectory, { recursive: true });
    const fileName = `property-transition-${Date.now()}.gif`;
    await writeFile(path.join(outputDirectory, fileName), gifBuffer);
    const gifUrl = getMediaPublicUrl("generated", "gifs", fileName);

    recordGenerationUsage({
      propertyId: payload.propertyId ?? null,
      kind: "gif_transition",
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      generatedImages: 0,
      estimatedCostUsd: 0,
      note: "GIF собрана локально через sharp, OpenAI не используется.",
    });

    return NextResponse.json({
      gifUrl,
      sizeBytes: gifBuffer.byteLength,
      estimatedCostUsd: 0,
      note: "GIF собрана локально через sharp, OpenAI не используется.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Не удалось сгенерировать GIF." },
      { status: 500 }
    );
  }
}
