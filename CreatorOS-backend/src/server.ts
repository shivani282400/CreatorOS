import "dotenv/config";
import { buildApp } from "./app";

const start = async () => {
  const app = buildApp();

  try {
    await app.listen({ port: 4000 });
    console.log("CreatorOS API running on port 4000");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
