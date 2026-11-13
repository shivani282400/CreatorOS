/**
 * Central place for environment-driven configuration.
 * Anything security-sensitive fails fast instead of falling back to a default.
 */

export const isProduction = () => process.env.NODE_ENV === "production";

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "JWT_SECRET is not set. Refusing to start. Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
    );
  }

  if (secret === "supersecret") {
    throw new Error("JWT_SECRET must not be the old default value 'supersecret'. Refusing to start.");
  }

  if (secret.length < 32) {
    console.warn("[config] JWT_SECRET is shorter than 32 characters. Use a longer random value.");
  }

  return secret;
};

/** Comma-separated list of allowed browser origins, e.g. https://creatoros.vercel.app */
export const getAllowedOrigins = (): string[] =>
  (process.env.FRONTEND_URL ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

export const isOriginAllowed = (origin: string | undefined): boolean => {
  // Non-browser clients (curl, health checks, server-to-server) send no Origin header.
  if (!origin) return true;

  const normalized = origin.replace(/\/+$/, "");
  if (getAllowedOrigins().includes(normalized)) return true;

  // Local development convenience only.
  if (!isProduction() && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) {
    return true;
  }

  return false;
};

export const isRegistrationEnabled = () => process.env.ALLOW_REGISTRATION !== "false";

export const getDemoCredentials = () => {
  const email = process.env.DEMO_EMAIL?.trim().toLowerCase();
  const password = process.env.DEMO_PASSWORD;
  return email && password ? { email, password } : null;
};
