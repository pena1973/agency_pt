import { z } from "zod";

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),

  OPENAI_TEXT_MODEL: z.string().default("gpt-5.1"),
  OPENAI_VISION_MODEL: z.string().default("gpt-5.1"),
  OPENAI_IMAGE_MODEL: z.string().default("gpt-image-1"),


  ROOM_AI_STORAGE_PATH: z.string().default("./public/generated"),
  ROOM_AI_DEFAULT_VARIANTS: z.coerce.number().int().positive().default(3),
  ROOM_AI_MAX_PHOTOS: z.coerce.number().int().positive().default(5),
  ROOM_AI_MAX_IMAGE_MB: z.coerce.number().positive().default(15),
  ROOM_AI_DEBUG: z.coerce.boolean().default(false),
});

export const env = envSchema.parse(process.env);