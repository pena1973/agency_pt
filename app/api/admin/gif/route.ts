import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { recordGenerationUsage } from "@/lib/db/generation-usage";

export const runtime = "nodejs";

type GifPayload = {
  startImageUrl?: string;
  finishImageUrl?: string;
  propertyId?: string;
  startSeconds?: number;
  transitionSeconds?: number;
  finishSeconds?: number;
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

function getPublicFilePath(imageUrl: string) {
  if (!imageUrl.startsWith("/")) {
    return null;
  }

  const normalizedPath = imageUrl.split("?")[0]?.replace(/^\/+/, "");

  if (!normalizedPath) {
    return null;
  }

  const publicRoot = path.resolve(process.cwd(), "public");
  const resolvedPath = path.resolve(publicRoot, normalizedPath);

  return resolvedPath.startsWith(publicRoot) ? resolvedPath : null;
}

async function readImageBuffer(imageUrl: string, requestUrl: string) {
  const publicFilePath = getPublicFilePath(imageUrl);

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

async function normalizeImage(image: Buffer) {
  return sharp(image)
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, {
      fit: "cover",
      position: "center",
    })
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
      normalizeImage(startImage),
      normalizeImage(finishImage),
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

    const outputDirectory = path.resolve(process.cwd(), "public", "generated", "gifs");
    await mkdir(outputDirectory, { recursive: true });
    const fileName = `property-transition-${Date.now()}.gif`;
    await writeFile(path.join(outputDirectory, fileName), gifBuffer);

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
      gifUrl: `/generated/gifs/${fileName}`,
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
