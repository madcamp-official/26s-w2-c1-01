import { useEffect, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getErrorMessage } from "../api/client";
import "./LoginPage.css";

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const { handleGithubCallback } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const code = searchParams.get("code");
    if (!code) {
      setStatus("error");
      setError("GitHub 인증 코드가 없습니다. 다시 로그인해주세요.");
      return;
    }

    handleGithubCallback(code)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setError(getErrorMessage(err, "로그인 처리 중 오류가 발생했습니다."));
      });
  }, [searchParams, handleGithubCallback]);

  if (status === "success") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <section className="login-page">
      <div className="login-card">
        {status === "loading" && <p className="login-description">GitHub 로그인 처리 중입니다...</p>}
        {status === "error" && (
          <>
            <p className="login-error">{error}</p>
            <a className="btn-primary" href="/login">
              로그인 화면으로 돌아가기
            </a>
          </>
        )}
      </div>
    </section>
  );
}
