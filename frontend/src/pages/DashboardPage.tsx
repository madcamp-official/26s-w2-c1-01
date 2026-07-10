import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <section style={{ padding: "2rem" }}>
      <h1>안녕하세요, {user?.name}님</h1>
      <img src={user?.avatarUrl} alt={user?.name} width={64} height={64} style={{ borderRadius: "50%" }} />
      <p>GitHub ID: {user?.githubId}</p>
      <div style={{ display: "flex", gap: "12px", justifyContent: "center", margin: "16px 0" }}>
        <Link to="/collect">GitHub 프로젝트 수집</Link>
        <Link to="/projects">내 프로젝트</Link>
        <Link to="/job-posting">채용공고 등록</Link>
      </div>
      <button type="button" onClick={logout}>
        로그아웃
      </button>
    </section>
  );
}
