import "dotenv/config";
import dns from "node:dns";
import { buildApp } from "./app";
import { initDatabase } from "./plugins/db";
import { ensureDemoAccount } from "./services/demoService";

// 🔥 FIX: Render/Infra IPv6 connectivity issues
// Force DNS to prefer IPv4 when resolving hostnames like Supabase/Neon
dns.setDefaultResultOrder("ipv4first");

const start = async () => {
  let app: ReturnType<typeof buildApp>;

  try {
    // Throws a readable error (and exits) if JWT_SECRET is missing.
    app = buildApp();
  } catch (error) {
    console.error(`[startup] ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  try {
    await initDatabase();

    try {
      await ensureDemoAccount();
    } catch (error) {
      // A demo-account problem must never stop the API from starting.
      app.log.error({ err: error }, "Demo account setup failed");
    }

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
