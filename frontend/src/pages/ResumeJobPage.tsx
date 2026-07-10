import { useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useJobPolling } from "../hooks/useJobPolling";
import { getResumeJob } from "../api/resume";
import type { JobResponse } from "../types/job";
import "./ResumeJobPage.css";

export function ResumeJobPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const poll = useCallback(() => {
    return getResumeJob(accessToken!, Number(jobId));
  }, [accessToken, jobId]);

  const { data: job, error } = useJobPolling<JobResponse>(poll);

  useEffect(() => {
    if (job?.status === "completed" && job.resultId) {
      navigate(`/resume-results/${job.resultId}`, { replace: true });
    }
  }, [job, navigate]);

  return (
    <section className="resume-job-page">
      <div className="resume-job-card">
        <h1>이력서 초안 생성</h1>
        {job?.status === "failed" ? (
          <p className="resume-job-error">{job.error?.detail ?? error ?? "이력서 생성에 실패했습니다."}</p>
        ) : (
          <div className="resume-job-progress">
            <div className="spinner" aria-hidden="true" />
            <p>{job?.message ?? "이력서 초안을 준비하고 있습니다..."}</p>
          </div>
        )}
      </div>
    </section>
  );
}
