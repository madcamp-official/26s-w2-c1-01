import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header, PageContainer } from "../components/Layout";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { SegmentedControl } from "../components/SegmentedControl";
import { useJobPosting } from "../features/jobPosting/useJobPosting";
import { useAuth } from "../features/auth/useAuth";
import { startGithubCollection } from "../api/github";
import { registerJobPosting } from "../api/jobPosting";
import { ApiError } from "../api/client";
import "./InputUploadPage.css";

const jobModeOptions = [
  { value: "url" as const, label: "URL로 등록" },
  { value: "text" as const, label: "직접 입력" },
];

export function InputUploadPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state: jobState, setMode, setUrl, setRawText } = useJobPosting();
  const [agreedToAnalyze, setAgreedToAnalyze] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const content = jobState.mode === "url" ? jobState.url : jobState.rawText;
  const canSubmit = agreedToAnalyze && content.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      // api-spec.md #5 POST /github/collection-jobs
      await startGithubCollection(agreedToAnalyze as true);
      // api-spec.md #9 POST /job-postings
      const jobPosting = await registerJobPosting({ inputType: jobState.mode, content: content.trim() });
      navigate("/projects", { state: { jobPostingId: jobPosting.jobPostingId } });
    } catch (err) {
      if (err instanceof ApiError && err.code === "JOB_POSTING_URL_FETCH_FAILED") {
        setMode("text");
        setErrorMessage("채용공고 URL을 읽을 수 없어요. 공고 내용을 직접 입력해 주세요.");
      } else {
        setErrorMessage(err instanceof Error ? err.message : "잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <PageContainer maxWidth={760}>
        <p className="input-eyebrow">채용공고 맞춤 이력서 추천</p>
        <h1 className="input-title">
          공고에 딱 맞는 이력서,
          <br />
          3분이면 충분해요
        </h1>
        <p className="input-subtitle">
          GitHub 프로젝트를 수집하고 채용공고를 등록하면
          <br />
          강조할 경험과 이력서 초안을 근거와 함께 추천해 드려요.
        </p>

        <Card style={{ marginBottom: 20 }}>
          <div className="input-card-head">
            <span className="input-card-title">GitHub 프로젝트 수집</span>
            <span className="input-step-badge">STEP 1</span>
          </div>
          <p className="input-card-desc">로그인한 GitHub 계정의 repository와 README를 수집해 프로젝트 후보를 만들어요.</p>

          <div className="input-github-row">
            <span className="input-github-row__badge">GitHub</span>
            <span className="input-github-row__id">github.com/{user?.githubId ?? "yxxnxyxxn"}</span>
            <span className="input-github-row__status">로그인됨 ✓</span>
          </div>

          <div
            className="input-consent-row"
            role="checkbox"
            aria-checked={agreedToAnalyze}
            tabIndex={0}
            onClick={() => setAgreedToAnalyze((v) => !v)}
            onKeyDown={(e) => e.key === "Enter" && setAgreedToAnalyze((v) => !v)}
          >
            <span className={`input-consent-row__box${agreedToAnalyze ? " input-consent-row__box--checked" : ""}`}>
              {agreedToAnalyze ? "✓" : ""}
            </span>
            <div>
              <p className="input-consent-row__title">공개 repository 분석에 동의합니다</p>
              <p className="input-consent-row__desc">수집한 내용은 프로젝트 후보 생성과 이력서 추천에만 사용돼요.</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="input-card-head">
            <span className="input-card-title">채용공고 등록</span>
            <span className="input-step-badge">STEP 2</span>
          </div>
          <p className="input-card-desc">URL을 읽지 못하면 직접 입력으로 안내해 드려요.</p>

          <SegmentedControl options={jobModeOptions} value={jobState.mode} onChange={setMode} />

          {jobState.mode === "url" && (
            <div className="input-field-stack">
              <input
                type="url"
                placeholder="채용공고 URL을 붙여넣어 주세요 (예: https://careers.company.com/job/1234)"
                className="input-text-field"
                value={jobState.url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <div className="input-hint">
                <span className="input-hint__dot" />
                회사명 · 직무 · 필수/우대 기술 · 요구 역량을 자동으로 추출해요
              </div>
            </div>
          )}

          {jobState.mode === "text" && (
            <textarea
              rows={6}
              placeholder="공고 내용을 그대로 붙여넣어 주세요. 회사명, 직무, 담당 업무, 자격 요건, 우대 사항이 포함되면 더 정확해요."
              className="input-textarea"
              value={jobState.rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
          )}

          {errorMessage && <p className="input-error">{errorMessage}</p>}
        </Card>
      </PageContainer>

      <div className="input-fixed-cta">
        <Button
          variant="primary"
          size="lg"
          className="input-fixed-cta__btn"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {submitting ? "수집하는 중..." : "프로젝트 수집하고 확인하기 →"}
        </Button>
      </div>
    </>
  );
}
