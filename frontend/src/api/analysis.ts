import type { JobResponse } from "../types/job";
import type { AnalysisJobResult } from "../types/analysis";
import { apiFetch } from "./client";

// api-spec.md #10 POST /job-postings/{jobPostingId}/analysis-jobs
export function startAnalysisJob(
  jobPostingId: number,
  recommendationLimit = 3,
): Promise<JobResponse> {
  return apiFetch<JobResponse>(`/job-postings/${jobPostingId}/analysis-jobs`, {
    method: "POST",
    body: JSON.stringify({ recommendationLimit }),
  });
}

// api-spec.md #11 GET /analysis-jobs/{jobId}
export function getAnalysisJob(jobId: number): Promise<AnalysisJobResult> {
  return apiFetch<AnalysisJobResult>(`/analysis-jobs/${jobId}`);
}
