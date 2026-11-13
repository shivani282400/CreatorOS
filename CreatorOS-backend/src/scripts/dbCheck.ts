import "dotenv/config";
import { db } from "../plugins/db";

/** Read-only health report for the database in DATABASE_URL. Prints counts, never row contents. */
const run = async () => {
  const version = await db.query("SELECT version()");
  console.log("Connected:", String(version.rows[0].version).split(",")[0]);

  const vector = await db.query("SELECT extversion FROM pg_extension WHERE extname = 'vector'");
  console.log("pgvector:", vector.rows[0] ? `installed (${vector.rows[0].extversion})` : "NOT installed (run: CREATE EXTENSION vector;)");

  for (const table of ["users", "content", "calendar", "memory_embeddings", "auth_otps", "auth_refresh_sessions"]) {
    try {
      const result = await db.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
      console.log(`${table.padEnd(24)} ${result.rows[0].count} rows`);
    } catch {
      console.log(`${table.padEnd(24)} missing (will be created on next start)`);
    }
  }

  try {
    const orphaned = await db.query("SELECT COUNT(*)::int AS count FROM content WHERE user_id IS NULL");
    console.log("content without an owner:", orphaned.rows[0].count);
    const dupes = await db.query(
      "SELECT COUNT(*)::int AS count FROM (SELECT LOWER(email) FROM users GROUP BY 1 HAVING COUNT(*) > 1) d"
    );
    console.log("emails that differ only by case:", dupes.rows[0].count);
  } catch {
    // tables not created yet
  }

  await db.end();
};

run().catch(async (error) => {
  console.error("Database check failed:", error instanceof Error ? error.message : error);
  await db.end().catch(() => undefined);
  process.exit(1);
});
