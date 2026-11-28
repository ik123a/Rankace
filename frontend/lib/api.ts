export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Resolve backend origin; falls back to same-origin Next.js routes when hosted without NEXT_PUBLIC_API_URL. */
export function resolveApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return "";
  }
  return API_URL;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("rankace_token");
}

export function setToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("rankace_token", token);
  }
}

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("rankace_token");
    window.location.href = "/login";
  }
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Fetch an API path from the configured backend, falling back to same-origin Next.js routes if local backend is offline. */
export async function fetchApi(path: string, options: RequestInit = {}): Promise<Response> {
  const base = resolveApiBase();
  try {
    return await fetch(`${base}${path}`, options);
  } catch (err) {
    if (base && !process.env.NEXT_PUBLIC_API_URL && typeof window !== "undefined") {
      return await fetch(path, options);
    }
    throw err;
  }
}

function formatApiError(status: number, statusText: string, raw: string): string {
  if (raw) {
    const trimmed = raw.trim();
    if (trimmed.startsWith("<")) {
      return `HTTP ${status}: ${statusText || "Endpoint unavailable"}`;
    }
    try {
      const errData = JSON.parse(raw);
      if (errData && errData.detail) {
        return typeof errData.detail === "string" ? errData.detail : JSON.stringify(errData.detail);
      }
    } catch {
      return trimmed.slice(0, 240);
    }
  }
  return `Request failed: ${status}`;
}

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...authHeaders(),
    ...(options.headers || {}),
  };

  const res = await fetchApi(path, {
    ...options,
    headers,
  });

  const raw = await res.text();

  if (!res.ok) {
    throw new Error(formatApiError(res.status, res.statusText, raw));
  }

  if (!raw) return undefined as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

export async function downloadBlob(path: string, defaultFilename: string): Promise<void> {
  const res = await fetchApi(path, {
    headers: {
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    throw new Error(formatApiError(res.status, res.statusText, raw));
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = defaultFilename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
