const TOKEN_STORAGE_KEY = "creator_token";

/**
 * Where the API lives:
 *  - VITE_API_URL if set (e.g. https://creatoros-api.onrender.com, or "/api" behind a proxy)
 *  - production without VITE_API_URL: same origin under /api (the Vercel rewrite in vercel.json)
 *  - local development: the usual localhost ports
 */
const getApiCandidates = () => {
  if (typeof window === "undefined") {
    return ["http://localhost:4000"];
  }

  const envBase = (import.meta.env?.VITE_API_URL as string | undefined)?.trim().replace(/\/+$/, "");
  if (envBase) return [envBase];

  if (import.meta.env?.PROD) return [`${window.location.origin}/api`];

  return [...new Set([
    `http://${window.location.hostname}:4000`,
    "http://localhost:4000",
    "http://127.0.0.1:4000"
  ])];
};

const buildApiUrl = (baseUrl: string, path: string) => `${baseUrl}${path}`;

export const getStoredToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    window.localStorage.getItem(TOKEN_STORAGE_KEY) ||
    window.localStorage.getItem("token")
  );
};

export const setStoredToken = (token: string) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const clearStoredToken = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.localStorage.removeItem("token");
};

export const apiUrl = (path: string) => buildApiUrl(getApiCandidates()[0], path);

export const apiFetch = async (path: string, init: RequestInit = {}) => {
  const candidates = getApiCandidates();
  let lastError: unknown = null;

  for (const baseUrl of candidates) {
    try {
      return await fetch(buildApiUrl(baseUrl, path), {
        credentials: "include",
        ...init
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Could not reach the backend");
};

// Several requests can hit a 401 at the same moment (the dashboard fires a few in parallel).
// Refresh tokens rotate on use, so only ONE refresh may run; everyone else waits for it.
let refreshInFlight: Promise<string | null> | null = null;

const refreshAccessToken = (): Promise<string | null> => {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await apiFetch("/auth/refresh", { method: "POST" });
        if (!response.ok) return null;

        const refreshed = await response.json();
        if (!refreshed.token || typeof refreshed.token !== "string") return null;

        setStoredToken(refreshed.token);
        return refreshed.token as string;
      } catch {
        return null;
      } finally {
        // Let the next expiry start a fresh refresh.
        setTimeout(() => {
          refreshInFlight = null;
        }, 0);
      }
    })();
  }

  return refreshInFlight;
};

const redirectToLogin = () => {
  if (typeof window === "undefined") return;

  const path = window.location.pathname;
  if (path === "/login" || path === "/" || path.startsWith("/onboarding")) return;

  window.location.replace("/login");
};

export const authFetch = async (path: string, init: RequestInit = {}) => {
  const requestWithToken = (token: string | null) => {
    const headers = new Headers(init.headers);

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return apiFetch(path, {
      ...init,
      headers
    });
  };

  const response = await requestWithToken(getStoredToken());
  if (response.status !== 401) return response;

  const newToken = await refreshAccessToken();

  if (!newToken) {
    clearStoredToken();
    redirectToLogin();
    return response;
  }

  return requestWithToken(newToken);
};

/** Reads a JSON body without throwing when the server returned HTML or nothing. */
export const readJson = async <T = unknown>(response: Response): Promise<T | null> => {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

/** Turns a failed fetch into a message a user can act on. */
export const describeError = (error: unknown, fallback = "Something went wrong. Please try again.") => {
  if (error instanceof TypeError) {
    return "Can't reach the server. If it was idle it may be waking up, so wait a few seconds and retry.";
  }
  return error instanceof Error && error.message ? error.message : fallback;
};
