import { useNavigate } from "react-router-dom";
import { Header, PageContainer } from "../components/Layout";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { SourceRow } from "../components/SourceRow";
import { useAuth } from "../features/auth/useAuth";
import { useHistory } from "../features/history/useHistory";
import { mockConnectedSources } from "../features/mock/mockData";
import "./MyPage.css";

export function MyPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { history } = useHistory();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <>
      <Header />
      <PageContainer maxWidth={760}>
        <Card style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div className="mypage-avatar">{user?.name?.[0] ?? "나"}</div>
          <div className="mypage-profile-info">
            <p className="mypage-profile-name">{user?.name ?? "유나연"}</p>
            <p className="mypage-profile-meta">
              {user?.email ?? "yxxnxyxxn@gmail.com"} · {user?.headline ?? "프론트엔드 개발자 지망"}
            </p>
          </div>
          <Button variant="ghost" style={{ padding: "12px 18px", fontSize: 14, whiteSpace: "nowrap" }}>
            프로필 수정
          </Button>
        </Card>

        <Card style={{ marginBottom: 20 }}>
          <div className="mypage-section-head">
            <p className="mypage-section-title">연결된 포트폴리오</p>
            <button className="mypage-add-link" onClick={() => navigate("/analyze")}>
              + 추가하기
            </button>
          </div>
          <div className="mypage-list">
            {mockConnectedSources.map((source) => (
              <SourceRow key={source.id} source={source} />
            ))}
          </div>
        </Card>

        <Card>
          <p className="mypage-section-title" style={{ marginBottom: 18 }}>
            분석 기록
          </p>
          <div className="mypage-list">
            {history.map((entry, i) => (
              <div key={entry.id} className="history-row">
                <div className="history-row__info">
                  <p className="history-row__title">{entry.jobTitle}</p>
                  <p className="history-row__meta">
                    {entry.date} · 프로젝트 {entry.projectCount}개 분석
                  </p>
                </div>
                <span
                  className={`history-row__score${entry.matchScore < 70 ? " history-row__score--low" : ""}`}
                >
                  매칭도 {entry.matchScore}%
                </span>
                <Button
                  variant={i === 0 ? "dark" : "ghost"}
                  style={{ padding: "10px 16px", fontSize: 13, whiteSpace: "nowrap" }}
                  onClick={() => navigate(`/result/${entry.resultId}`)}
                >
                  결과 보기
                </Button>
              </div>
            ))}
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
