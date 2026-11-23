// Fetch wrapper for the FoodHub API.
// - The access token lives in memory only (never localStorage).
// - Refresh is single-flight: refresh tokens rotate, so two parallel refresh
//   calls would log the user out. Everyone shares one in-flight promise.

let accessToken = null;
let refreshPromise = null;
let onSessionExpired = () => {};

export const setAccessToken = (t) => {
  accessToken = t;
};
export const setSessionExpiredHandler = (fn) => {
  onSessionExpired = fn;
};

export function refreshAccessToken() {
  refreshPromise ??= fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
    .then(async (r) => {
      if (!r.ok) throw Object.assign(new Error("SESSION_EXPIRED"), { status: 401 });
      const { accessToken: t } = await r.json();
      accessToken = t;
      return t;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
  get notImplemented() {
    return this.status === 501;
  }
}

export async function api(path, { method = "GET", body, query, auth = true, retry = true, signal } = {}) {
  const params = query
    ? new URLSearchParams(
        Object.entries(query)
          .filter(([, v]) => v !== undefined && v !== null && v !== "")
          .map(([k, v]) => [k, String(v)]),
      ).toString()
    : "";
  let res;
  try {
    res = await fetch(`/api${path}${params ? "?" + params : ""}`, {
      method,
      credentials: "include",
      signal,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new ApiError("Can't reach the FoodHub server. Is the API running on :3000?", 0);
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && retry && data.message === "Access token expired") {
    try {
      await refreshAccessToken();
    } catch {
      onSessionExpired();
      throw new ApiError("Your session expired. Please log in again.", 401, data);
    }
    return api(path, { method, body, query, auth, retry: false, signal });
  }
  if (res.status === 401 && data.message === "Invalid access token") onSessionExpired();

  if (!res.ok) {
    const msg = data.errors?.length ? `${data.message}: ${data.errors.join(", ")}` : data.message;
    throw new ApiError(msg || res.statusText || "Something went wrong", res.status, data);
  }
  return data;
}
