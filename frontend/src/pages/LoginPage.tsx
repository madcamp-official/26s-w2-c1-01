import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header, PageContainer } from "../components/Layout";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { useAuth } from "../features/auth/useAuth";
import "./LoginPage.css";

export function LoginPage() {
  const navigate = useNavigate();
  const { loginWithGithub } = useAuth();
  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async () => {
    setLoggingIn(true);
    try {
      await loginWithGithub();
      navigate("/my");
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <>
      <Header />
      <PageContainer maxWidth={420} paddingTop={110} centered>
        <Card large style={{ padding: "44px 36px", textAlign: "center" }}>
          <div className="login-logo">핏</div>
          <h1 className="login-title">GitHub로 시작해요</h1>
          <p className="login-subtitle">
            이력핏은 GitHub 계정으로 로그인해요.
            <br />
            로그인하면 프로젝트 수집을 바로 시작할 수 있어요.
          </p>

          <Button
            variant="dark"
            fullWidth
            style={{ padding: 17, fontSize: 16 }}
            onClick={handleLogin}
            disabled={loggingIn}
          >
            {loggingIn ? "로그인하는 중..." : "GitHub로 로그인"}
          </Button>

          <p className="login-footnote">
            로그인 시 공개 프로필 정보만 사용해요.
            <br />
            repository 분석은 별도 동의 후에 진행돼요.
          </p>
        </Card>
      </PageContainer>
    </>
  );
}
