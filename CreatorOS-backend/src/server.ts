import "dotenv/config";
import { buildApp } from "./app";
import { initDatabase } from "./plugins/db";

const start = async () => {
  const app = buildApp();

  try {
    await initDatabase();
    const port = Number(process.env.PORT || 4000);
    await app.listen({ port });
    console.log(`CreatorOS API running on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
