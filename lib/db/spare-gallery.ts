import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  adminUploadedPhotos,
  aiGenerationJobs,
  aiGenerationResults,
  propertyImages,
} from "@/lib/db/schema";

export type SpareGalleryItem = {
  id: string;
  imageUrl: string;
  title: string;
  source: "upload" | "ai";
  createdAt: string;
};

export async function saveUploadedPhotosForProperty(
  propertyId: string,
  uploads: Array<{ url: string; roomType?: string | null }>
) {
  const now = new Date();

  if (uploads.length === 0) {
    return;
  }

  await db.insert(adminUploadedPhotos).values(
    uploads.map((upload, index) => ({
      id: `${propertyId}-upload-${Date.now()}-${index + 1}`,
      propertyId,
      fileUrl: upload.url,
      roomType: upload.roomType as never,
      selectedForAi: true,
      selectedForGallery: false,
      createdAt: now,
    }))
  );
}

export async function ensureSpareImageForProperty(propertyId: string, imageUrl: string) {
  const existingUpload = await db
    .select({ id: adminUploadedPhotos.id })
    .from(adminUploadedPhotos)
    .where(
      and(
        eq(adminUploadedPhotos.propertyId, propertyId),
        eq(adminUploadedPhotos.fileUrl, imageUrl)
      )
    )
    .limit(1);

  if (existingUpload.length > 0) {
    return;
  }

  const jobRows = await db
    .select({ id: aiGenerationJobs.id })
    .from(aiGenerationJobs)
    .where(eq(aiGenerationJobs.propertyId, propertyId));
  const jobIds = jobRows.map((job) => job.id);

  if (jobIds.length > 0) {
    const existingAi = await db
      .select({ id: aiGenerationResults.id })
      .from(aiGenerationResults)
      .where(
        and(
          inArray(aiGenerationResults.jobId, jobIds),
          eq(aiGenerationResults.imageUrl, imageUrl)
        )
      )
      .limit(1);

    if (existingAi.length > 0) {
      return;
    }
  }

  await saveUploadedPhotosForProperty(propertyId, [{ url: imageUrl }]);
}

export async function readSpareGalleryForProperty(
  propertyId: string
): Promise<SpareGalleryItem[]> {
  const uploadRows = await db
    .select()
    .from(adminUploadedPhotos)
    .where(eq(adminUploadedPhotos.propertyId, propertyId))
    .orderBy(desc(adminUploadedPhotos.createdAt));

  const jobRows = await db
    .select()
    .from(aiGenerationJobs)
    .where(eq(aiGenerationJobs.propertyId, propertyId))
    .orderBy(desc(aiGenerationJobs.createdAt));
  const jobIds = jobRows.map((job) => job.id);

  const aiRows =
    jobIds.length > 0
      ? await db
          .select()
          .from(aiGenerationResults)
          .where(inArray(aiGenerationResults.jobId, jobIds))
      : [];
  const jobsById = new Map(jobRows.map((job) => [job.id, job] as const));
  const mainGalleryRows = await db
    .select({ imageUrl: propertyImages.imageUrl })
    .from(propertyImages)
    .where(eq(propertyImages.propertyId, propertyId));
  const mainGalleryUrls = new Set(mainGalleryRows.map((row) => row.imageUrl));

  return [
    ...uploadRows.map((row): SpareGalleryItem => ({
      id: row.id,
      imageUrl: row.fileUrl,
      title: "Загруженное фото",
      source: "upload",
      createdAt: row.createdAt.toISOString(),
    })),
    ...aiRows.map((row): SpareGalleryItem => ({
      id: row.id,
      imageUrl: row.imageUrl,
      title: row.title ?? "AI-вариант",
      source: "ai",
      createdAt: (jobsById.get(row.jobId)?.createdAt ?? new Date()).toISOString(),
    })),
  ]
    .filter((item) => !mainGalleryUrls.has(item.imageUrl))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function deleteSpareGalleryItem(imageUrl: string) {
  await db.delete(adminUploadedPhotos).where(eq(adminUploadedPhotos.fileUrl, imageUrl));
  await db.delete(aiGenerationResults).where(eq(aiGenerationResults.imageUrl, imageUrl));
}
