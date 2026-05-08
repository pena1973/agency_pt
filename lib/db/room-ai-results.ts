import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { aiGenerationJobs, aiGenerationResults } from "@/lib/db/schema";
import type { GenerateRoomDesignResult, RoomVariant } from "@/lib/room-ai/types";

const emptyRoomAnalysis: GenerateRoomDesignResult["roomAnalysis"] = {
  estimatedDimensions: {
    widthM: null,
    lengthM: null,
    heightM: null,
    confidence: "low",
  },
  detectedObjects: [],
  removableObjects: [],
  fixedElements: [],
  constraints: [],
  notes: [],
  openings: [],
};

function mapSavedVariant(
  row: typeof aiGenerationResults.$inferSelect,
  index: number
): RoomVariant {
  return {
    id: row.id,
    title: row.title ?? `AI-вариант ${index + 1}`,
    description: row.description ?? "Сохраненный AI-вариант обстановки.",
    furniture: [],
    photoImageUrl: row.imageUrl,
    palette: [],
    layoutSource: "ai",
  };
}

export async function saveRoomAiResultForProperty(
  propertyId: string,
  result: GenerateRoomDesignResult,
  palette: string
): Promise<GenerateRoomDesignResult> {
  const now = new Date();

  await db.insert(aiGenerationJobs).values({
    id: result.jobId,
    propertyId,
    sourcePhotoId: null,
    palette: palette as never,
    status: "completed",
    createdAt: now,
  });

  if (result.variants.length > 0) {
    await db.insert(aiGenerationResults).values(
      result.variants.map((variant, index) => ({
        id: `${result.jobId}-result-${index + 1}`,
        jobId: result.jobId,
        imageUrl: variant.photoImageUrl,
        title: variant.title,
        description: variant.description,
        selectedForGallery: false,
        sortOrder: index,
      }))
    );
  }

  return {
    ...result,
    createdAt: now.toISOString(),
  };
}

export async function readRoomAiResultsForProperty(
  propertyId: string
): Promise<GenerateRoomDesignResult | null> {
  const jobRows = await db
    .select()
    .from(aiGenerationJobs)
    .where(eq(aiGenerationJobs.propertyId, propertyId))
    .orderBy(desc(aiGenerationJobs.createdAt));

  if (jobRows.length === 0) {
    return null;
  }

  const jobIds = jobRows.map((job) => job.id);
  const resultRows = await db
    .select()
    .from(aiGenerationResults)
    .where(inArray(aiGenerationResults.jobId, jobIds));

  const resultRowsByJobId = new Map<string, Array<typeof aiGenerationResults.$inferSelect>>();
  for (const row of resultRows) {
    const currentRows = resultRowsByJobId.get(row.jobId) ?? [];
    currentRows.push(row);
    resultRowsByJobId.set(row.jobId, currentRows);
  }

  const variants = jobRows.flatMap((job) =>
    (resultRowsByJobId.get(job.id) ?? [])
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((row, index) => mapSavedVariant(row, index))
  );

  return {
    jobId: jobRows[0].id,
    roomAnalysis: emptyRoomAnalysis,
    variants,
    createdAt: jobRows[0].createdAt.toISOString(),
  };
}
