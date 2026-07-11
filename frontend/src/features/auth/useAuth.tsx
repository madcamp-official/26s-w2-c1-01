import { createContext, useContext, useState, type ReactNode } from "react";
import type { User } from "../../types/user";
import { exchangeGithubCode, getGithubLoginUrl } from "../../api/auth";
import { setAccessToken } from "../../api/client";

interface AuthContextValue {
  user: User | null;
  loginWithGithub: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const loginWithGithub = async () => {
    // api-spec.md #2 GET /auth/github/login — 실제 구현에서는 이 redirectUrl로 이동 후 GitHub 콜백에서 code를 받음
    await getGithubLoginUrl();
    // api-spec.md #3 GET /auth/github/callback?code=...
    const { accessToken, user: loggedInUser } = await exchangeGithubCode("mock-code");
    setAccessToken(accessToken);
    setUser(loggedInUser);
  };

  const logout = () => {
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loginWithGithub, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
