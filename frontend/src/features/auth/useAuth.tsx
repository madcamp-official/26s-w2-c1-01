import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "../../types/user";
import { exchangeGithubCode, getGithubLoginUrl, getMe } from "../../api/auth";
import { getAccessToken, setAccessToken } from "../../api/client";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  loginWithGithub: () => Promise<void>;
  handleGithubCallback: (code: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 새로고침 시 저장된 토큰으로 세션 복구 — api-spec.md #4 GET /me
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    getMe()
      .then(setUser)
      .catch(() => {
        setAccessToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const loginWithGithub = async () => {
    // api-spec.md #2 GET /auth/github/login — 이 redirectUrl로 이동 후 GitHub 콜백에서 code를 받음
    const { redirectUrl } = await getGithubLoginUrl();
    window.location.href = redirectUrl;
  };

  // api-spec.md #3 GET /auth/github/callback?code=... — /auth/github/callback 페이지에서 호출
  const handleGithubCallback = async (code: string) => {
    const { accessToken, user: loggedInUser } = await exchangeGithubCode(code);
    setAccessToken(accessToken);
    setUser(loggedInUser);
  };

  const logout = () => {
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, loginWithGithub, handleGithubCallback, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
