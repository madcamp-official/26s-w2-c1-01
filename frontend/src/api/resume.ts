import type { JobResponse } from "../types/job";
import type { ResumeResult } from "../types/resume";
import { apiFetch } from "./client";

export interface StartResumeJobPayload {
  jobPostingId: number;
  projectIds: number[];
}

// api-spec.md #12 POST /resume-jobs
export function startResumeJob(payload: StartResumeJobPayload): Promise<JobResponse> {
  if (payload.projectIds.length === 0) {
    throw new Error("이력서 생성에 사용할 프로젝트를 1개 이상 선택해주세요.");
  }
  return apiFetch<JobResponse>("/resume-jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// api-spec.md #13 GET /resume-jobs/{jobId}
export function getResumeJob(jobId: number): Promise<JobResponse> {
  return apiFetch<JobResponse>(`/resume-jobs/${jobId}`);
}

// api-spec.md #14 GET /resume-results/{resumeResultId}
export function getResumeResult(resumeResultId: number): Promise<ResumeResult> {
  return apiFetch<ResumeResult>(`/resume-results/${resumeResultId}`);
}
