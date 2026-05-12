import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { dbEnv } from "@/lib/db/env";
import * as schema from "@/lib/db/schema";

const sqlitePath = path.isAbsolute(dbEnv.DATABASE_PATH)
  ? dbEnv.DATABASE_PATH
  : path.join(process.cwd(), dbEnv.DATABASE_PATH);

mkdirSync(path.dirname(sqlitePath), { recursive: true });

const sqlite = new Database(sqlitePath);

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export type DatabaseClient = typeof db;
export { sqlite };
