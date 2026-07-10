import { apiRequest } from "./client";
import type { JobResponse } from "../types/job";
import type { AnalysisJobResponse } from "../types/analysis";

// docs/api-spec.md 10. 공고 분석 시작
export function startJobPostingAnalysis(accessToken: string, jobPostingId: number, recommendationLimit: number) {
  return apiRequest<JobResponse>(`/job-postings/${jobPostingId}/analysis-jobs`, {
    method: "POST",
    accessToken,
    body: { recommendationLimit },
  });
}

// docs/api-spec.md 11. 공고 분석 상태 및 결과 조회
export function getAnalysisJob(accessToken: string, jobId: number) {
  return apiRequest<AnalysisJobResponse>(`/analysis-jobs/${jobId}`, { accessToken });
}
