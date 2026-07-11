import { createContext, useContext, useState, type ReactNode } from "react";
import type { User } from "../../types/user";
import { login as apiLogin, loginWithProvider as apiLoginWithProvider, logout as apiLogout } from "../../api/auth";
import type { LoginPayload } from "../../api/auth";

interface AuthContextValue {
  user: User | null;
  login: (payload: LoginPayload) => Promise<void>;
  loginWithProvider: (provider: "github" | "google") => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (payload: LoginPayload) => {
    const loggedInUser = await apiLogin(payload);
    setUser(loggedInUser);
  };

  const loginWithProvider = async (provider: "github" | "google") => {
    const loggedInUser = await apiLoginWithProvider(provider);
    setUser(loggedInUser);
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithProvider, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
