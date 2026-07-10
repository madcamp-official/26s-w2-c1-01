// docs/api-spec.md 의 Base URL은 8000이지만, 현재 mock 서버(src/api/mocks/handlers.ts)는
// 8080을 사용하고 있어 개발 중에는 8080을 기본값으로 둡니다.
// 실제 백엔드 주소가 정해지면 .env 의 VITE_API_BASE_URL 로 덮어쓰세요.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export interface ApiErrorBody {
  status: "failed";
  message: string;
  error: {
    code: string;
    detail: string;
  };
}

export class ApiError extends Error {
  code: string;
  detail: string;
  status: number;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.error.code;
    this.detail = body.error.detail;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  accessToken?: string | null;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, accessToken, headers, ...rest } = options;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (data && data.status === "failed") {
      throw new ApiError(res.status, data as ApiErrorBody);
    }
    throw new ApiError(res.status, {
      status: "failed",
      message: "알 수 없는 오류가 발생했습니다.",
      error: { code: "UNKNOWN_ERROR", detail: `HTTP ${res.status}` },
    });
  }

  return data as T;
}

export function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}
