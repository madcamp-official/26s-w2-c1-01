import { useLocation, useNavigate } from "react-router-dom";
import { Header, PageContainer } from "../components/Layout";
import { Card } from "../components/Card";
import { ProgressBar } from "../components/ProgressBar";
import { useAnalysis, analysisSteps } from "../features/analysis/useAnalysis";
import "./AnalysisProgressPage.css";

const statusPillLabel: Record<string, string> = {
  pending: "대기 중",
  running: "진행 중",
  completed: "완료",
  failed: "분석 실패",
};

interface LocationState {
  jobPostingId?: number;
}

export function AnalysisProgressPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { jobPostingId } = (location.state as LocationState | null) ?? {};

  // api-spec.md #10~11 POST /job-postings/{jobPostingId}/analysis-jobs → GET /analysis-jobs/{jobId} 폴링
  const { progress, status, currentStep } = useAnalysis({
    jobPostingId: jobPostingId ?? 201,
    onComplete: (jobId) => navigate(`/result/${jobId}`),
  });

  const done = status === "completed";
  const failed = status === "failed";
  const currentStepLabel = failed
    ? "분석 중 문제가 발생했어요"
    : done
      ? "분석이 끝났어요!"
      : `${analysisSteps[currentStep].label}...`;

  return (
    <>
      <Header />
      <PageContainer maxWidth={520} paddingTop={110} centered>
        <Card large style={{ padding: "52px 40px" }}>
          <span className={`progress-status-pill progress-status-pill--${status}`}>
            {statusPillLabel[status]}
          </span>
          <p className="progress-step-counter">
            {currentStep + 1}
            <span className="progress-step-counter__total"> / {analysisSteps.length}</span>
          </p>
          <h2 className="progress-step-label">{currentStepLabel}</h2>

          <div style={{ marginBottom: 36 }}>
            <ProgressBar percent={progress} variant="primary" />
          </div>

          <div className="progress-steps">
            {analysisSteps.map((step, i) => {
              const isDone = done || i < currentStep;
              const isActive = !isDone && i === currentStep;
              return (
                <div key={step.label} className="progress-step-row">
                  <span
                    className={`progress-step-dot${isDone ? " progress-step-dot--done" : isActive ? " progress-step-dot--active" : ""}`}
                  >
                    {isDone ? "✓" : i + 1}
                  </span>
                  <span
                    className={`progress-step-text${isDone || isActive ? " progress-step-text--active" : ""}`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
        <p className="progress-footnote">
          작업 상태를 주기적으로 확인하고 있어요 · 없는 경험은 만들지 않아요
        </p>
      </PageContainer>
    </>
  );
}
