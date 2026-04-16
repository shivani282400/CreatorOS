import "dotenv/config";
import dns from "node:dns";
import { buildApp } from "./app";
import { initDatabase } from "./plugins/db";

// 🔥 FIX: Render/Infra IPv6 connectivity issues
// Force DNS to prefer IPv4 when resolving hostnames like Supabase/Neon
dns.setDefaultResultOrder("ipv4first");

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
