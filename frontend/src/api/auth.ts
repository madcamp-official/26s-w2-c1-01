import type { User } from "../types/user";
import { mockUser } from "../features/mock/mockData";

export interface LoginPayload {
  email: string;
  password: string;
}

// TODO: replace with real POST /auth/login call. For now, any input is accepted (mock auth).
export async function login(_payload: LoginPayload): Promise<User> {
  await new Promise((r) => setTimeout(r, 300));
  return mockUser;
}

// TODO: replace with real OAuth redirect flow (GitHub/Google)
export async function loginWithProvider(_provider: "github" | "google"): Promise<User> {
  await new Promise((r) => setTimeout(r, 300));
  return mockUser;
}

// TODO: call POST /auth/logout to invalidate session
export async function logout(): Promise<void> {
  await new Promise((r) => setTimeout(r, 100));
}
