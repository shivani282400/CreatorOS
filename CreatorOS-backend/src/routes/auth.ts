import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { createUser, findUserByEmail } from "../services/userService";

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request, reply) => {
    const { email, password } = request.body as {
      email?: string
      password?: string
    };

    if (!email || !password) {
      return reply.code(400).send({
        error: "Email and password are required"
      });
    }

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return reply.code(409).send({
        error: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser(email, hashedPassword);

    const token = app.jwt.sign({
      id: user.id,
      email: user.email
    });

    return {
      user: {
        id: user.id,
        email: user.email
      },
      token
    };
  });

  app.post("/auth/login", async (request, reply) => {
    const { email, password } = request.body as {
      email?: string
      password?: string
    };

    if (!email || !password) {
      return reply.code(400).send({
        error: "Email and password are required"
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return reply.code(401).send({
        error: "Invalid credentials"
      });
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return reply.code(401).send({
        error: "Invalid credentials"
      });
    }

    const token = app.jwt.sign({
      id: user.id,
      email: user.email
    });

    return {
      user: {
        id: user.id,
        email: user.email
      },
      token
    };
  });
}
