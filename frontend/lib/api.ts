export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  }
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...authHeaders(),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  // Read the body ONCE as text. The previous version called res.json() and then
  // fell back to res.text() inside the catch -- but the body stream is already
  // consumed by then, so the fallback always threw "body used already" and the
  // real error detail was lost. Reading text first keeps both paths possible
  // and tolerates the empty body that a 204 returns (JSON.parse("") throws).
  const raw = await res.text();

  if (!res.ok) {
    let errorMsg = `Request failed: ${res.status}`;
    if (raw) {
      try {
        const errData = JSON.parse(raw);
        if (errData && errData.detail) {
          errorMsg =
            typeof errData.detail === "string" ? errData.detail : JSON.stringify(errData.detail);
        } else {
          errorMsg = raw;
        }
      } catch {
        errorMsg = raw;
      }
    }
    throw new Error(errorMsg);
  }

  if (!raw) return undefined as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

export async function downloadBlob(path: string, defaultFilename: string): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    // The API answers every failure with a JSON `detail`; surfacing only the
    // status code told the user "418" instead of "no crawl has run yet".
    let detail = "";
    try {
      const payload = await res.json();
      if (payload && typeof payload.detail === "string") detail = payload.detail;
    } catch {
      detail = "";
    }
    throw new Error(detail || `Download failed with status ${res.status}`);
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
