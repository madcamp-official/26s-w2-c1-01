import { useEffect, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Header, PageContainer } from "../components/Layout";
import { Card } from "../components/Card";
import { useAuth } from "../features/auth/useAuth";
import { ApiError } from "../api/client";

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
        setError(err instanceof ApiError ? err.message : "로그인 처리 중 오류가 발생했습니다.");
      });
  }, [searchParams, handleGithubCallback]);

  if (status === "success") {
    return <Navigate to="/my" replace />;
  }

  return (
    <>
      <Header />
      <PageContainer maxWidth={420} paddingTop={110} centered>
        <Card large style={{ padding: "44px 36px", textAlign: "center" }}>
          {status === "loading" && <p>GitHub 로그인 처리 중입니다...</p>}
          {status === "error" && <p>{error}</p>}
        </Card>
      </PageContainer>
    </>
  );
}
