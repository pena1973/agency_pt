import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {
  ensureDirectoryForFile,
  loadProjectEnv,
  nowMs,
  resolveProjectPath,
} from "./shared.mjs";

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));
}

function ensureMigrationsTable(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS __app_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL
    );
  `);
}

function applyMigrationFile(database, fileName) {
  const alreadyApplied = database
    .prepare("SELECT 1 FROM __app_migrations WHERE filename = ? LIMIT 1")
    .get(fileName);

  if (alreadyApplied) {
    return false;
  }

  const migrationPath = path.join(MIGRATIONS_DIR, fileName);
  const sql = fs.readFileSync(migrationPath, "utf8");
  const transaction = database.transaction(() => {
    database.exec(sql);
    database
      .prepare(
        "INSERT INTO __app_migrations (filename, applied_at) VALUES (?, ?)"
      )
      .run(fileName, nowMs());
  });

  transaction();
  return true;
}

const env = loadProjectEnv();
const databasePath = resolveProjectPath(env.DATABASE_PATH);

ensureDirectoryForFile(databasePath);

const database = new Database(databasePath);
database.pragma("journal_mode = WAL");
database.pragma("foreign_keys = ON");

ensureMigrationsTable(database);

const migrationFiles = getMigrationFiles();

if (migrationFiles.length === 0) {
  console.log("No migration files found in ./drizzle");
  database.close();
  process.exit(0);
}

const appliedMigrations = [];

for (const fileName of migrationFiles) {
  const applied = applyMigrationFile(database, fileName);

  if (applied) {
    appliedMigrations.push(fileName);
  }
}

database.close();

console.log(`Database file: ${databasePath}`);
console.log(
  appliedMigrations.length > 0
    ? `Applied migrations: ${appliedMigrations.join(", ")}`
    : "No new migrations to apply."
);
