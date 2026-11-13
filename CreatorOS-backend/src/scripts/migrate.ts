import "dotenv/config";
import { db, initDatabase } from "../plugins/db";

/**
 * Applies the (idempotent) schema to the database in DATABASE_URL.
 * Safe to run repeatedly against an existing database: nothing is dropped or rewritten.
 */
const run = async () => {
  await initDatabase();
  console.log("Schema is up to date.");
  await db.end();
};

run().catch(async (error) => {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  await db.end().catch(() => undefined);
  process.exit(1);
});
