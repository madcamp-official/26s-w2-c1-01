import { useNavigate } from "react-router-dom";
import { Header, PageContainer } from "../components/Layout";
import { Button } from "../components/Button";
import "./MainPage.css";

const steps = [
  {
    num: "1",
    title: "공고와 포트폴리오 등록",
    desc: "채용공고는 URL·이미지·직접 입력으로, 포트폴리오는 GitHub·Notion·PDF로 간편하게 등록해요.",
    dark: false,
  },
  {
    num: "2",
    title: "LLM이 분석하고 매칭",
    desc: "공고 요구 역량과 내 프로젝트를 의미 단위로 비교해 적합도 순위를 계산해요.",
    dark: false,
  },
  {
    num: "3",
    title: "근거 있는 문장 추천",
    desc: "모든 문장에 원문 출처를 연결해요. 없는 경험과 확인 안 된 수치는 만들지 않아요.",
    dark: true,
  },
];

const features = [
  "부족 역량 보완 프로젝트 제안",
  "Markdown · PDF 내보내기",
  "분석 기록 저장",
];

export function MainPage() {
  const navigate = useNavigate();

  return (
    <>
      <Header />
      <PageContainer maxWidth={960}>
        <div className="main-hero">
          <span className="main-hero__badge">LLM 기반 · 근거 있는 추천만</span>
          <h1 className="main-hero__title">
            이력서, 공고에 맞춰
            <br />
            새로 쓰지 말고 <span className="main-hero__title-accent">골라 쓰세요</span>
          </h1>
          <p className="main-hero__subtitle">
            채용공고와 포트폴리오를 등록하면,
            <br />
            강조할 경험과 이력서 문장을 원문 근거와 함께 추천해 드려요.
          </p>
          <div className="main-hero__ctas">
            <Button variant="primary" size="lg" onClick={() => navigate("/analyze")}>
              지금 분석 시작하기
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate("/login")}>
              로그인
            </Button>
          </div>
        </div>

        <div className="main-steps">
          {steps.map((s) => (
            <div key={s.num} className={`main-step-card${s.dark ? " main-step-card--dark" : ""}`}>
              <div className={`main-step-card__num${s.dark ? " main-step-card__num--accent" : ""}`}>
                {s.num}
              </div>
              <p className="main-step-card__title">{s.title}</p>
              <p className="main-step-card__desc">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="main-features">
          {features.map((f) => (
            <span key={f} className="main-features__item">
              <span className="main-features__check">✓</span>
              {f}
            </span>
          ))}
        </div>
      </PageContainer>
    </>
  );
}
