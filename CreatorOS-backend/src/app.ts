import Fastify from "fastify";
import cors from "@fastify/cors";
import { aiRoutes } from "./routes/ai";
import { contentRoutes } from "./routes/content";
import { calendarRoutes } from "./routes/calendar";

export const buildApp = () => {
const app = Fastify({
logger: true
});

// Enable CORS so frontend can call backend
app.register(cors, {
origin: true
});

// Register AI routes
app.register(aiRoutes);

app.register(contentRoutes);
app.register(calendarRoutes);


// Health check route
app.get("/health", async () => {
return { status: "CreatorOS backend running" };
});

return app;
};
