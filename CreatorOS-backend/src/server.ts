import "dotenv/config";
import { buildApp } from "./app";
import { initDatabase } from "./plugins/db";

const start = async () => {
  const app = buildApp();

  try {
    await initDatabase();
    const port = Number(process.env.PORT || 4000);
    await app.listen({ port, host: "0.0.0.0" });
    app.log.info(`CreatorOS API running on port ${port}`);
    console.log(`Server started successfully on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
