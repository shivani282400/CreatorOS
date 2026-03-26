import "@fastify/jwt";
import "fastify";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      id: number
      email: string
    }
    user: {
      id: number
      email: string
    }
  }
}

declare module "fastify" {
  interface FastifyRequest {
    user: {
      id: number
      email: string
    }
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}
