import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../api/client";
import "./LoginPage.css";

export function LoginPage() {
  const { isAuthenticated, isLoading, loginWithGithub } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleLoginClick() {
    setError(null);
    setIsRedirecting(true);
    try {
      await loginWithGithub();
    } catch (err) {
      setIsRedirecting(false);
      setError(err instanceof ApiError ? err.message : "로그인을 시작할 수 없습니다. 잠시 후 다시 시도해주세요.");
    }
  }

  return (
    <section className="login-page">
      <div className="login-card">
        <h1>채용공고 맞춤 이력서 추천</h1>
        <p className="login-description">
          GitHub 계정으로 로그인하면 프로젝트를 자동으로 수집하고, 채용공고에 맞는 이력서 내용을 추천해드립니다.
        </p>
        <button
          type="button"
          className="github-login-button"
          onClick={handleLoginClick}
          disabled={isRedirecting || isLoading}
        >
          <GithubMark />
          {isRedirecting ? "GitHub로 이동 중..." : "GitHub로 로그인"}
        </button>
        {error && <p className="login-error">{error}</p>}
      </div>
    </section>
  );
}

function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
