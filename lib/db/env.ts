import { z } from "zod";

const dbEnvSchema = z.object({
  DATABASE_PATH: z.string().min(1).default("../uploads/storage/app.db"),
  ADMIN_EMAIL: z.email().default("admin@example.com"),
});

export const dbEnv = dbEnvSchema.parse({
  DATABASE_PATH: process.env.DATABASE_PATH ?? process.env.SQLITE_PATH,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
});
