// TODO: replace with real base URL from env (e.g. import.meta.env.VITE_API_BASE_URL)
export const API_BASE_URL = "/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// TODO: wire up fetch with auth headers/cookies once backend auth is defined
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    throw new ApiError(`Request failed: ${path}`, res.status);
  }
  return res.json() as Promise<T>;
}
