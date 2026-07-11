import type { User } from "../types/user";
import type { GithubCallbackResponse } from "../types/auth";
import { apiFetch } from "./client";

// api-spec.md #2 GET /auth/github/login
export function getGithubLoginUrl(): Promise<{ redirectUrl: string }> {
  return apiFetch<{ redirectUrl: string }>("/auth/github/login");
}

// api-spec.md #3 GET /auth/github/callback?code=...
export function exchangeGithubCode(code: string): Promise<GithubCallbackResponse> {
  return apiFetch<GithubCallbackResponse>(`/auth/github/callback?code=${encodeURIComponent(code)}`);
}

// api-spec.md #4 GET /me
export function getMe(): Promise<User> {
  return apiFetch<User>("/me");
}
