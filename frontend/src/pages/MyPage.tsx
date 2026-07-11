import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header, PageContainer } from "../components/Layout";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { useAuth } from "../features/auth/useAuth";
import { fetchProjects } from "../api/projects";
import type { ApiProject } from "../types/project";
import "./MyPage.css";

export function MyPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<ApiProject[]>([]);

  useEffect(() => {
    // api-spec.md #7 GET /projects
    fetchProjects().then(setProjects);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <>
      <Header />
      <PageContainer maxWidth={760}>
        <Card style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div className="mypage-avatar">{user?.name?.[0] ?? "나"}</div>
          <div className="mypage-profile-info">
            <p className="mypage-profile-name">{user?.name ?? "게스트"}</p>
            <p className="mypage-profile-meta">@{user?.githubId ?? "-"} · GitHub 계정으로 로그인됨</p>
          </div>
          <Button variant="ghost" style={{ padding: "12px 18px", fontSize: 14, whiteSpace: "nowrap" }}>
            프로필 수정
          </Button>
        </Card>

        <Card style={{ marginBottom: 20 }}>
          <div className="mypage-section-head">
            <p className="mypage-section-title">GitHub 연동</p>
            <button className="mypage-add-link" onClick={() => navigate("/analyze")}>
              다시 수집하기
            </button>
          </div>
          <div className="mypage-github-row">
            <span className="mypage-github-row__badge">GitHub</span>
            <span className="mypage-github-row__id">github.com/{user?.githubId ?? "-"}</span>
            <span className="mypage-github-row__status">연결됨 ✓</span>
          </div>
        </Card>

        <Card>
          <div className="mypage-projects-row">
            <div className="mypage-projects-row__info">
              <p className="mypage-section-title">내 프로젝트</p>
              <p className="mypage-projects-row__desc">
                수집된 프로젝트 <b className="mypage-projects-row__count">{projects.length}개</b>가 이력서
                생성에 사용돼요.
              </p>
            </div>
            <Button
              variant="dark"
              style={{ padding: "12px 18px", fontSize: 14, whiteSpace: "nowrap" }}
              onClick={() => navigate("/projects")}
            >
              프로젝트 관리
            </Button>
          </div>
        </Card>

        <div className="mypage-logout">
          <Button variant="underline" onClick={handleLogout}>
            로그아웃
          </Button>
        </div>
      </PageContainer>
    </>
  );
}
