import { apiRequest } from "./client";
import type { GithubCallbackResponse, GithubLoginResponse, User } from "../types/auth";

// docs/api-spec.md 2. GitHub 로그인 시작
export function getGithubLoginUrl() {
  return apiRequest<GithubLoginResponse>("/auth/github/login");
}

// docs/api-spec.md 3. GitHub 로그인 콜백
export function exchangeGithubCode(code: string) {
  const params = new URLSearchParams({ code });
  return apiRequest<GithubCallbackResponse>(`/auth/github/callback?${params.toString()}`);
}

// docs/api-spec.md 4. 내 정보 조회
export function fetchMe(accessToken: string) {
  return apiRequest<User>("/me", { accessToken });
}
