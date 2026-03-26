import { FastifyInstance } from "fastify";
import { getUserById, updateUserProfile } from "../services/userService";

export async function userRoutes(app: FastifyInstance) {
  app.get(
    "/user/profile",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = await getUserById(request.user.id);

      if (!user) {
        return reply.code(404).send({
          error: "User not found"
        });
      }

      return {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          niche: user.niche,
          tone: user.tone,
          platform: user.platform,
          created_at: user.created_at
        }
      };
    }
  );

  app.put(
    "/user/profile",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { niche, tone, platform } = request.body as {
        niche?: string
        tone?: string
        platform?: string
      };

      const updatedUser = await updateUserProfile(request.user.id, {
        niche,
        tone,
        platform
      });

      if (!updatedUser) {
        return reply.code(404).send({
          error: "User not found"
        });
      }

      return {
        success: true,
        data: updatedUser
      };
    }
  );
}
