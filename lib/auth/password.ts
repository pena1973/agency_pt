import crypto from "node:crypto";

const HASH_PREFIX = "scrypt";

export function createPasswordHash(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");

  return `${HASH_PREFIX}:${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [prefix, salt, storedDerivedKey] = storedHash.split(":");

  if (prefix !== HASH_PREFIX || !salt || !storedDerivedKey) {
    return false;
  }

  const actualDerivedKey = crypto.scryptSync(password, salt, 64).toString("hex");

  return crypto.timingSafeEqual(
    Buffer.from(actualDerivedKey, "hex"),
    Buffer.from(storedDerivedKey, "hex")
  );
}
