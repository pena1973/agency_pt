import { defineConfig } from "drizzle-kit";

const databasePath = process.env.DATABASE_PATH ?? "./data/real-estate/app.db";

export default defineConfig({
  dialect: "sqlite",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databasePath,
  },
  strict: true,
  verbose: true,
});
