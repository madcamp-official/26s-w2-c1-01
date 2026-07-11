// api-spec.md #Base URL — 개발 환경 기본값
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const ACCESS_TOKEN_STORAGE_KEY = "accessToken";

let accessToken: string | null = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }
}

export function getAccessToken() {
  return accessToken;
}

// api-spec.md #인증 방식 — Authorization: Bearer {accessToken}
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...headers, ...init?.headers },
  });

  if (!res.ok) {
    // api-spec.md #공통 에러 응답
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.message ?? `Request failed: ${path}`, res.status, body?.error?.code);
  }
  return res.json() as Promise<T>;
}
