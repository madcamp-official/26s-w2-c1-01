import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header, PageContainer } from "../components/Layout";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { useAuth } from "../features/auth/useAuth";
import { fetchCvs } from "../api/cvs";
import { fetchProjects } from "../api/projects";
import type { CvDocument } from "../types/cv";
import type { ApiProject } from "../types/project";
import "./MyPage.css";

export function MyPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [cvs, setCvs] = useState<CvDocument[]>([]);

  useEffect(() => {
    fetchProjects().then(setProjects).catch(() => setProjects([]));
    fetchCvs().then(setCvs).catch(() => setCvs([]));
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
          <div className="mypage-avatar">{user?.name?.[0] ?? "?"}</div>
          <div className="mypage-profile-info">
            <p className="mypage-profile-name">{user?.name ?? "게스트"}</p>
            <p className="mypage-profile-meta">@{user?.githubId ?? "-"} · GitHub 계정으로 로그인됨</p>
          </div>
          <Button variant="ghost" style={{ padding: "12px 18px", fontSize: 14, whiteSpace: "nowrap" }}>
            프로필 수정
          </Button>
        </Card>

        <Card style={{ marginBottom: 20 }}>
          <div className="mypage-projects-row">
            <div className="mypage-projects-row__info">
              <p className="mypage-section-title">채용 공고 등록</p>
              <p className="mypage-projects-row__desc">
                채용 공고 URL이나 텍스트를 등록하면 맞춤 이력서 추천을 받을 수 있어요.
              </p>
            </div>
            <Button
              variant="primary"
              style={{ padding: "12px 18px", fontSize: 14, whiteSpace: "nowrap" }}
              onClick={() => navigate("/analyze")}
            >
              공고 등록하러 가기
            </Button>
          </div>
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
            <span className="mypage-github-row__status">연결됨</span>
          </div>
        </Card>

        <Card style={{ marginBottom: 20 }}>
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

        <Card>
          <div className="mypage-projects-row">
            <div className="mypage-projects-row__info">
              <p className="mypage-section-title">내 CV 관리</p>
              <p className="mypage-projects-row__desc">
                등록된 CV <b className="mypage-projects-row__count">{cvs.length}개</b>의 경력과 프로젝트 경험을
                분석에 함께 반영해요.
              </p>
            </div>
            <Button
              variant="dark"
              style={{ padding: "12px 18px", fontSize: 14, whiteSpace: "nowrap" }}
              onClick={() => navigate("/cvs")}
            >
              CV 관리
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
