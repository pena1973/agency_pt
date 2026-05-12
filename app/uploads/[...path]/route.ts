import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { resolveMediaStoragePath } from "@/lib/media/storage";

export const dynamic = "force-dynamic";

type UploadRouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

const CONTENT_TYPES: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function getContentType(filePath: string) {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

function isInsideStorageRoot(filePath: string) {
  const storageRoot = resolveMediaStoragePath();
  const relativePath = path.relative(storageRoot, filePath);

  return relativePath !== "" && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

export async function GET(_request: Request, { params }: UploadRouteContext) {
  const { path: pathSegments } = await params;
  const filePath = resolveMediaStoragePath(...pathSegments);

  if (!isInsideStorageRoot(filePath)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const fileStat = await stat(filePath);

    if (!fileStat.isFile()) {
      return new Response("Not found", { status: 404 });
    }

    const fileBuffer = await readFile(filePath);

    return new Response(new Uint8Array(fileBuffer), {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(fileBuffer.byteLength),
        "Content-Type": getContentType(filePath),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
