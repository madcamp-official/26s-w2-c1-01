import type { User } from "../types/user";
import type { GithubCallbackResponse } from "../types/auth";
import { mockUser } from "../features/mock/mockData";

export interface LoginPayload {
  email: string;
  password: string;
}

// api-spec.md #2 GET /auth/github/login
export async function getGithubLoginUrl(): Promise<{ redirectUrl: string }> {
  await new Promise((r) => setTimeout(r, 100));
  return { redirectUrl: "https://github.com/login/oauth/authorize?client_id=TODO" };
}

// api-spec.md #3 GET /auth/github/callback?code=...
export async function exchangeGithubCode(_code: string): Promise<GithubCallbackResponse> {
  await new Promise((r) => setTimeout(r, 300));
  return { accessToken: "mock-access-token", user: mockUser };
}

// api-spec.md #4 GET /me
export async function getMe(): Promise<User> {
  await new Promise((r) => setTimeout(r, 200));
  return mockUser;
}

export async function login(payload: LoginPayload): Promise<User> {
  await new Promise((r) => setTimeout(r, 300));
  return { ...mockUser, email: payload.email };
}

export async function loginWithProvider(_provider: "github" | "google"): Promise<User> {
  await new Promise((r) => setTimeout(r, 300));
  return mockUser;
}

export async function logout(): Promise<void> {
  await new Promise((r) => setTimeout(r, 100));
}
