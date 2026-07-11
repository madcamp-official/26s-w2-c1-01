import { useEffect, useState } from "react";
import type { JobStatus } from "../../types/job";
import { getAnalysisJob, startAnalysisJob } from "../../api/analysis";
import { mockAnalysisSteps } from "../mock/mockData";

export const analysisSteps = mockAnalysisSteps;

interface UseAnalysisOptions {
  jobPostingId: number;
  onComplete: (jobId: number) => void;
}

export function useAnalysis({ jobPostingId, onComplete }: UseAnalysisOptions) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<JobStatus>("pending");

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout>;
    const tickTimer = setInterval(() => setProgress((p) => Math.min(95, p + 1)), 90);

    // api-spec.md #11 GET /analysis-jobs/{jobId} — completed/failed일 때까지 주기적으로 확인
    async function poll(jobId: number) {
      const result = await getAnalysisJob(jobId);
      if (cancelled) return;
      setStatus(result.status);

      if (result.status === "completed" || result.status === "failed") {
        clearInterval(tickTimer);
        if (result.status === "completed") {
          setProgress(100);
          setTimeout(() => onComplete(jobId), 500);
        }
        return;
      }
      pollTimer = setTimeout(() => poll(jobId), 1200);
    }

    // api-spec.md #10 POST /job-postings/{jobPostingId}/analysis-jobs
    startAnalysisJob(jobPostingId).then((job) => {
      if (cancelled) return;
      setStatus(job.status);
      pollTimer = setTimeout(() => poll(job.jobId), 1800);
    });

    return () => {
      cancelled = true;
      clearInterval(tickTimer);
      clearTimeout(pollTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobPostingId]);

  let currentStep = 0;
  analysisSteps.forEach((step, i) => {
    if (progress >= step.at) currentStep = i;
  });

  return { progress, status, currentStep };
}
