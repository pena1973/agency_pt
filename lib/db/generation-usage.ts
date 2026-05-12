import { sqlite } from "@/lib/db/client";

export type GenerationUsageKind = "ai_furniture" | "gif_transition";

export type GenerationUsageSummary = {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalImages: number;
  totalCostUsd: number;
  totalCostEur: number;
  entriesCount: number;
};

type GenerationUsageRecord = {
  propertyId?: string | null;
  kind: GenerationUsageKind;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  generatedImages?: number;
  estimatedCostUsd?: number;
  note?: string;
};

function ensureGenerationUsageTable() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS generation_usage (
      id TEXT PRIMARY KEY,
      property_id TEXT,
      kind TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      generated_images INTEGER NOT NULL DEFAULT 0,
      estimated_cost_usd REAL NOT NULL DEFAULT 0,
      note TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS generation_usage_property_id_idx
      ON generation_usage(property_id);

    CREATE INDEX IF NOT EXISTS generation_usage_created_at_idx
      ON generation_usage(created_at);
  `);
}

function getUsdToEurRate() {
  const rate = Number(process.env.ROOM_AI_USD_TO_EUR_RATE ?? 0.92);

  return Number.isFinite(rate) && rate > 0 ? rate : 0.92;
}

export function recordGenerationUsage(record: GenerationUsageRecord) {
  ensureGenerationUsageTable();

  sqlite
    .prepare(
      `
      INSERT INTO generation_usage (
        id,
        property_id,
        kind,
        input_tokens,
        output_tokens,
        total_tokens,
        generated_images,
        estimated_cost_usd,
        note,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      `generation-usage-${Date.now()}-${crypto.randomUUID()}`,
      record.propertyId ?? null,
      record.kind,
      Math.max(0, Math.round(record.inputTokens ?? 0)),
      Math.max(0, Math.round(record.outputTokens ?? 0)),
      Math.max(0, Math.round(record.totalTokens ?? 0)),
      Math.max(0, Math.round(record.generatedImages ?? 0)),
      Math.max(0, Number(record.estimatedCostUsd ?? 0)),
      record.note ?? null,
      Date.now()
    );
}

export function readGenerationUsageSummary(): GenerationUsageSummary {
  ensureGenerationUsageTable();

  const row = sqlite
    .prepare(
      `
      SELECT
        COALESCE(SUM(input_tokens), 0) AS totalInputTokens,
        COALESCE(SUM(output_tokens), 0) AS totalOutputTokens,
        COALESCE(SUM(total_tokens), 0) AS totalTokens,
        COALESCE(SUM(generated_images), 0) AS totalImages,
        COALESCE(SUM(estimated_cost_usd), 0) AS totalCostUsd,
        COUNT(*) AS entriesCount
      FROM generation_usage
    `
    )
    .get() as GenerationUsageSummary;

  const totalCostUsd = Number(row.totalCostUsd ?? 0);

  return {
    totalInputTokens: Number(row.totalInputTokens ?? 0),
    totalOutputTokens: Number(row.totalOutputTokens ?? 0),
    totalTokens: Number(row.totalTokens ?? 0),
    totalImages: Number(row.totalImages ?? 0),
    totalCostUsd,
    totalCostEur: totalCostUsd * getUsdToEurRate(),
    entriesCount: Number(row.entriesCount ?? 0),
  };
}
