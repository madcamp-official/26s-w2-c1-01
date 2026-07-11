import type { JobResponse } from "../types/job";
import type { AnalysisJobResult } from "../types/analysis";
import { mockParsedJobPosting, mockRecommendedProjects } from "../features/mock/mockData";

// api-spec.md #10 POST /job-postings/{jobPostingId}/analysis-jobs
export async function startAnalysisJob(
  _jobPostingId: number,
  recommendationLimit = 3,
): Promise<JobResponse> {
  await new Promise((r) => setTimeout(r, 200));
  void recommendationLimit;
  return {
    jobId: 301,
    status: "pending",
    message: "채용공고 분석 작업이 생성되었습니다.",
    resultId: null,
    error: null,
  };
}

// api-spec.md #11 GET /analysis-jobs/{jobId}
export async function getAnalysisJob(_jobId: number): Promise<AnalysisJobResult> {
  await new Promise((r) => setTimeout(r, 200));
  return {
    jobId: 301,
    status: "completed",
    message: "채용공고 분석이 완료되었습니다.",
    resultId: 401,
    error: null,
    jobPosting: mockParsedJobPosting,
    recommendedProjects: mockRecommendedProjects,
  };
}
