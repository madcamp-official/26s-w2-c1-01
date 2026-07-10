import { useAuth } from "../hooks/useAuth";

export function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <section style={{ padding: "2rem" }}>
      <h1>안녕하세요, {user?.name}님</h1>
      <img src={user?.avatarUrl} alt={user?.name} width={64} height={64} style={{ borderRadius: "50%" }} />
      <p>GitHub ID: {user?.githubId}</p>
      <button type="button" onClick={logout}>
        로그아웃
      </button>
    </section>
  );
}
