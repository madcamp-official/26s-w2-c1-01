import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useJobPolling } from "../hooks/useJobPolling";
import { getAnalysisJob, startJobPostingAnalysis } from "../api/analysis";
import { startResumeGeneration } from "../api/resume";
import { ApiError } from "../api/client";
import { EvidenceModal } from "../components/EvidenceModal";
import type { AnalysisJobResponse } from "../types/analysis";
import "./JobPostingAnalysisPage.css";

const RECOMMENDATION_LIMIT_OPTIONS = [3, 5];

export function JobPostingAnalysisPage() {
  const { jobPostingId } = useParams<{ jobPostingId: string }>();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [recommendationLimit, setRecommendationLimit] = useState(3);
  const [jobId, setJobId] = useState<number | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([]);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [isGeneratingResume, setIsGeneratingResume] = useState(false);
  const [openEvidenceIds, setOpenEvidenceIds] = useState<number[] | null>(null);

  const poll = useCallback(() => {
    return getAnalysisJob(accessToken!, jobId!);
  }, [accessToken, jobId]);

  const { data: job, error: pollError } = useJobPolling<AnalysisJobResponse>(jobId ? poll : null);

  async function handleStart() {
    if (!accessToken || !jobPostingId) return;
    setStartError(null);
    setIsStarting(true);
    try {
      const res = await startJobPostingAnalysis(accessToken, Number(jobPostingId), recommendationLimit);
      setJobId(res.jobId);
    } catch (err) {
      setStartError(err instanceof ApiError ? err.message : "분석을 시작하지 못했습니다.");
    } finally {
      setIsStarting(false);
    }
  }

  function handleRetry() {
    setJobId(null);
    setStartError(null);
  }

  function toggleProjectSelection(projectId: number) {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId],
    );
  }

  async function handleGenerateResume() {
    if (!accessToken || !jobPostingId || selectedProjectIds.length === 0) return;
    setResumeError(null);
    setIsGeneratingResume(true);
    try {
      const res = await startResumeGeneration(accessToken, Number(jobPostingId), selectedProjectIds);
      navigate(`/resume-jobs/${res.jobId}`);
    } catch (err) {
      setResumeError(err instanceof ApiError ? err.message : "이력서 생성을 시작하지 못했습니다.");
      setIsGeneratingResume(false);
    }
  }

  const isRunning = jobId !== null && job?.status !== "completed" && job?.status !== "failed";

  return (
    <section className="analysis-page">
      <div className="analysis-card">
        <h1>채용공고 분석</h1>

        {!jobId && (
          <>
            <p className="analysis-description">
              등록한 채용공고를 분석해 추천 프로젝트 순위를 보여드립니다.
            </p>
            <label className="analysis-limit-select">
              추천 프로젝트 개수
              <select
                value={recommendationLimit}
                onChange={(e) => setRecommendationLimit(Number(e.target.value))}
              >
                {RECOMMENDATION_LIMIT_OPTIONS.map((limit) => (
                  <option key={limit} value={limit}>
                    {limit}개
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="analysis-button" onClick={handleStart} disabled={isStarting}>
              {isStarting ? "분석 시작하는 중..." : "공고 분석 시작"}
            </button>
            {startError && <p className="analysis-error">{startError}</p>}
          </>
        )}

        {jobId && isRunning && (
          <div className="analysis-progress">
            <div className="spinner" aria-hidden="true" />
            <p>{job?.message ?? "분석을 준비하고 있습니다..."}</p>
          </div>
        )}

        {job?.status === "failed" && (
          <div className="analysis-progress">
            <p className="analysis-error">{job.error?.detail ?? pollError ?? "분석 중 오류가 발생했습니다."}</p>
            <button type="button" className="analysis-button" onClick={handleRetry}>
              다시 시도하기
            </button>
          </div>
        )}

        {pollError && job?.status !== "failed" && <p className="analysis-error">{pollError}</p>}

        {job?.status === "completed" && job.jobPosting && (
          <div className="analysis-result">
            <div className="job-summary-card">
              <h2>
                {job.jobPosting.companyName} · {job.jobPosting.role}
              </h2>
              <div className="job-summary-row">
                <span className="job-summary-label">필수 기술</span>
                <div className="tag-list">
                  {job.jobPosting.requiredSkills.map((skill) => (
                    <span key={skill} className="tag tag-required">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div className="job-summary-row">
                <span className="job-summary-label">우대 기술</span>
                <div className="tag-list">
                  {job.jobPosting.preferredSkills.map((skill) => (
                    <span key={skill} className="tag">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div className="job-summary-row">
                <span className="job-summary-label">역량</span>
                <div className="tag-list">
                  {job.jobPosting.competencies.map((competency) => (
                    <span key={competency} className="tag">
                      {competency}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <h2 className="recommended-heading">추천 프로젝트</h2>
            <div className="recommended-list">
              {job.recommendedProjects
                ?.slice()
                .sort((a, b) => b.score - a.score)
                .map((project, index) => (
                  <article key={project.projectId} className="recommended-card">
                    <header className="recommended-card-header">
                      <label className="recommended-select">
                        <input
                          type="checkbox"
                          checked={selectedProjectIds.includes(project.projectId)}
                          onChange={() => toggleProjectSelection(project.projectId)}
                        />
                      </label>
                      <span className="recommended-rank">{index + 1}위</span>
                      <h3>{project.title}</h3>
                      <span className="recommended-score">{project.score}점</span>
                    </header>
                    <p className="recommended-reason">{project.reason}</p>
                    <div className="job-summary-row">
                      <span className="job-summary-label">일치 기술</span>
                      <div className="tag-list">
                        {project.matchedSkills.map((skill) => (
                          <span key={skill} className="tag tag-matched">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    {project.missingSkills.length > 0 && (
                      <div className="job-summary-row">
                        <span className="job-summary-label">부족 기술</span>
                        <div className="tag-list">
                          {project.missingSkills.map((skill) => (
                            <span key={skill} className="tag tag-missing">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {project.evidenceIds.length > 0 && (
                      <button
                        type="button"
                        className="evidence-view-button"
                        onClick={() => setOpenEvidenceIds(project.evidenceIds)}
                      >
                        근거 보기
                      </button>
                    )}
                  </article>
                ))}
            </div>

            <div className="analysis-generate-row">
              <button
                type="button"
                className="analysis-button"
                onClick={handleGenerateResume}
                disabled={selectedProjectIds.length === 0 || isGeneratingResume}
              >
                {isGeneratingResume
                  ? "이력서 생성 시작하는 중..."
                  : `선택한 ${selectedProjectIds.length}개 프로젝트로 이력서 초안 생성`}
              </button>
              {resumeError && <p className="analysis-error">{resumeError}</p>}
            </div>
          </div>
        )}
      </div>
      {openEvidenceIds && (
        <EvidenceModal evidenceIds={openEvidenceIds} onClose={() => setOpenEvidenceIds(null)} />
      )}
    </section>
  );
}
