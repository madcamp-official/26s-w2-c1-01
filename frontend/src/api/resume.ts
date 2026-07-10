import { apiRequest } from "./client";
import type { JobResponse } from "../types/job";
import type { ResumeResult } from "../types/resume";

// docs/api-spec.md 12. 이력서 생성 시작
export function startResumeGeneration(accessToken: string, jobPostingId: number, projectIds: number[]) {
  return apiRequest<JobResponse>("/resume-jobs", {
    method: "POST",
    accessToken,
    body: { jobPostingId, projectIds },
  });
}

// docs/api-spec.md 13. 이력서 생성 상태 조회
export function getResumeJob(accessToken: string, jobId: number) {
  return apiRequest<JobResponse>(`/resume-jobs/${jobId}`, { accessToken });
}

// docs/api-spec.md 14. 이력서 결과 조회
export function getResumeResult(accessToken: string, resumeResultId: number) {
  return apiRequest<ResumeResult>(`/resume-results/${resumeResultId}`, { accessToken });
}
