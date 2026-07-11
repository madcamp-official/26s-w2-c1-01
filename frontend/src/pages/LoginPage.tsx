import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Header, PageContainer } from "../components/Layout";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { useAuth } from "../features/auth/useAuth";
import "./LoginPage.css";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithProvider } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await login({ email, password });
    navigate("/my");
  };

  const handleProvider = async (provider: "github" | "google") => {
    await loginWithProvider(provider);
    navigate("/my");
  };

  return (
    <>
      <Header />
      <PageContainer maxWidth={420} paddingTop={88}>
        <Card large style={{ padding: "44px 36px" }}>
          <div className="login-logo">핏</div>
          <h1 className="login-title">다시 만나서 반가워요</h1>
          <p className="login-subtitle">로그인하고 이전 분석 기록을 이어서 보세요.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="이메일"
              className="login-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="비밀번호"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="login-forgot">
              <a href="#">비밀번호를 잊으셨나요?</a>
            </div>
            <Button type="submit" variant="primary" fullWidth style={{ padding: 17, fontSize: 16 }}>
              로그인
            </Button>
          </form>

          <div className="login-divider">
            <span className="login-divider__line" />
            <span className="login-divider__text">또는</span>
            <span className="login-divider__line" />
          </div>

          <div className="login-social">
            <Button
              variant="dark"
              fullWidth
              style={{ padding: 16, fontSize: 15 }}
              onClick={() => handleProvider("github")}
            >
              GitHub로 계속하기
            </Button>
            <Button
              variant="outline"
              fullWidth
              style={{ padding: 16, fontSize: 15 }}
              onClick={() => handleProvider("google")}
            >
              Google로 계속하기
            </Button>
          </div>

          <p className="login-signup">
            아직 계정이 없나요? <a href="#">회원가입</a>
          </p>
        </Card>
      </PageContainer>
    </>
  );
}
