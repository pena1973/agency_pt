import Database from "better-sqlite3";
import {
  createPasswordHash,
  ensureDirectoryForFile,
  loadProjectEnv,
  nowMs,
  resolveProjectPath,
} from "./shared.mjs";

const env = loadProjectEnv();
const databasePath = resolveProjectPath(env.DATABASE_PATH);

ensureDirectoryForFile(databasePath);

const database = new Database(databasePath);
database.pragma("journal_mode = WAL");
database.pragma("foreign_keys = ON");

const insertUser = database.prepare(`
  INSERT INTO users (
    id,
    email,
    password_hash,
    name,
    phone,
    role,
    created_at,
    last_active_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(email) DO UPDATE SET
    name = excluded.name,
    phone = excluded.phone,
    role = excluded.role,
    last_active_at = excluded.last_active_at
`);

const timestamp = nowMs();

const seedUsers = [
  {
    id: "user-admin-001",
    email: env.ADMIN_EMAIL,
    password: "Irina1!",
    name: "Main Admin",
    phone: "+351 900 000 001",
    role: "realtor",
  },
  {
    id: "user-realtor-001",
    email: "realtor@example.com",
    password: "Irina2!",
    name: "Irina Realtor",
    phone: "+351 900 000 002",
    role: "realtor",
  },
  {
    id: "user-client-001",
    email: "client@example.com",
    password: "Irina3!",
    name: "Demo Client",
    phone: "+351 900 000 003",
    role: "client",
  },
];

const transaction = database.transaction(() => {
  for (const user of seedUsers) {
    insertUser.run(
      user.id,
      user.email,
      createPasswordHash(user.password),
      user.name,
      user.phone,
      user.role,
      timestamp,
      timestamp
    );
  }
});

transaction();
database.close();

console.log(`Seeded users into ${databasePath}`);
console.log(`Admin email: ${env.ADMIN_EMAIL}`);
console.log("Seed credentials:");
console.log(`- Admin: ${env.ADMIN_EMAIL} / Irina1!`);
console.log("- Realtor: realtor@example.com / Irina2!");
console.log("- Client: client@example.com / Irina3!");
