import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = process.cwd();
const ENV_FILES = [".env.production", ".env.local"].map((fileName) =>
  path.join(PROJECT_ROOT, fileName),
);

function parseEnvFile(content) {
  const result = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    result[key] = value;
  }

  return result;
}

export function loadProjectEnv() {
  const fileValues = ENV_FILES.reduce((values, envFile) => {
    if (!fs.existsSync(envFile)) {
      return values;
    }

    return {
      ...values,
      ...parseEnvFile(fs.readFileSync(envFile, "utf8")),
    };
  }, {});

  return {
    DATABASE_PATH:
      process.env.DATABASE_PATH ??
      process.env.SQLITE_PATH ??
      fileValues.DATABASE_PATH ??
      fileValues.SQLITE_PATH ??
      "../uploads/storage/app.db",
    ADMIN_EMAIL:
      process.env.ADMIN_EMAIL ?? fileValues.ADMIN_EMAIL ?? "admin@example.com",
  };
}

export function resolveProjectPath(relativeOrAbsolutePath) {
  return path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(PROJECT_ROOT, relativeOrAbsolutePath);
}

export function ensureDirectoryForFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");

  return `scrypt:${salt}:${derivedKey}`;
}

export function nowMs() {
  return Date.now();
}
