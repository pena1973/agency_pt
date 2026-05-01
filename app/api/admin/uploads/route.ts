import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function sanitizeFileName(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf(".");
  const extension = lastDotIndex >= 0 ? fileName.slice(lastDotIndex) : ".jpg";
  const baseName = lastDotIndex >= 0 ? fileName.slice(0, lastDotIndex) : fileName;

  const normalizedBaseName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  return `${normalizedBaseName || "photo"}-${Date.now()}${extension}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Нужно выбрать хотя бы один файл." },
        { status: 400 }
      );
    }

    const uploadsDirectory = path.join(
      process.cwd(),
      "public",
      "uploads",
      "properties"
    );

    await mkdir(uploadsDirectory, { recursive: true });

    const uploads = await Promise.all(
      files.map(async (file) => {
        const bytes = await file.arrayBuffer();
        const fileName = sanitizeFileName(file.name);
        const absolutePath = path.join(uploadsDirectory, fileName);

        await writeFile(absolutePath, Buffer.from(bytes));

        return {
          name: file.name,
          url: `/uploads/properties/${fileName}`,
        };
      })
    );

    return NextResponse.json({ uploads });
  } catch {
    return NextResponse.json(
      { error: "Не удалось загрузить фотографии." },
      { status: 500 }
    );
  }
}
