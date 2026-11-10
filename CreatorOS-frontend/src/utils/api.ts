const TOKEN_STORAGE_KEY = "creator_token";

const getApiCandidates = () => {
  if (typeof window === "undefined") {
    return ["http://localhost:4000"];
  }

  const envBase =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL
      ? [import.meta.env.VITE_API_URL as string]
      : [];

  const hostnameBase = `http://${window.location.hostname}:4000`;

  return [...new Set([
    ...envBase,
    hostnameBase,
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

  const refreshResponse = await apiFetch("/auth/refresh", { method: "POST" });
  if (!refreshResponse.ok) {
    clearStoredToken();
    return response;
  }

  const refreshed = await refreshResponse.json();
  if (!refreshed.token || typeof refreshed.token !== "string") {
    clearStoredToken();
    return response;
  }

  setStoredToken(refreshed.token);
  return requestWithToken(refreshed.token);
};
