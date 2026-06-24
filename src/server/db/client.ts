import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export type AppDatabase = ReturnType<typeof createDatabase>;

let database: AppDatabase | null = null;

export function getDatabase(env: NodeJS.ProcessEnv = process.env): AppDatabase {
  if (database) {
    return database;
  }

  database = createDatabase(env);
  return database;
}

function createDatabase(env: NodeJS.ProcessEnv) {
  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL.");
  }

  const client = postgres(databaseUrl, { prepare: false });
  return drizzle(client, { schema });
}
