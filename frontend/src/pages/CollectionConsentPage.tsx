import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useJobPolling } from "../hooks/useJobPolling";
import { getGithubCollectionJob, startGithubCollection } from "../api/github";
import { ApiError } from "../api/client";
import type { JobResponse } from "../types/job";
import "./CollectionConsentPage.css";

export function CollectionConsentPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [jobId, setJobId] = useState<number | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const poll = useCallback(() => {
    return getGithubCollectionJob(accessToken!, jobId!);
  }, [accessToken, jobId]);

  const { data: job, error: pollError } = useJobPolling<JobResponse>(jobId ? poll : null);

  async function handleStart() {
    if (!agreed || !accessToken) return;
    setStartError(null);
    setIsStarting(true);
    try {
      const res = await startGithubCollection(accessToken, true);
      setJobId(res.jobId);
    } catch (err) {
      setStartError(err instanceof ApiError ? err.message : "수집을 시작하지 못했습니다.");
    } finally {
      setIsStarting(false);
    }
  }

  function handleRetry() {
    setJobId(null);
    setStartError(null);
  }

  const isRunning = jobId !== null && job?.status !== "completed" && job?.status !== "failed";

  return (
    <section className="consent-page">
      <div className="consent-card">
        <h1>GitHub 프로젝트 수집</h1>
        <p className="consent-description">
          GitHub repository와 README를 분석해 프로젝트 후보를 자동으로 만들어드립니다. 분석에 동의하시면 공개
          저장소의 코드와 문서를 수집합니다.
        </p>

        {!jobId && (
          <>
            <label className="consent-checkbox">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              GitHub 프로젝트 및 README 데이터를 분석하는 데 동의합니다.
            </label>
            <button type="button" className="consent-button" onClick={handleStart} disabled={!agreed || isStarting}>
              {isStarting ? "시작하는 중..." : "GitHub 프로젝트 수집 시작"}
            </button>
            {startError && <p className="consent-error">{startError}</p>}
          </>
        )}

        {jobId && isRunning && (
          <div className="consent-progress">
            <div className="spinner" aria-hidden="true" />
            <p>{job?.message ?? "수집을 준비하고 있습니다..."}</p>
          </div>
        )}

        {job?.status === "completed" && (
          <div className="consent-progress">
            <p>{job.message}</p>
            <button type="button" className="consent-button" onClick={() => navigate("/projects")}>
              프로젝트 목록 보기
            </button>
          </div>
        )}

        {(job?.status === "failed" || pollError) && (
          <div className="consent-progress">
            <p className="consent-error">{job?.error?.detail ?? pollError ?? "수집 중 오류가 발생했습니다."}</p>
            <button type="button" className="consent-button" onClick={handleRetry}>
              다시 시도하기
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
