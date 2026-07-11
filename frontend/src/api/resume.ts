import type { JobResponse } from "../types/job";
import type { ResumeResult } from "../types/resume";
import { mockResumeResult } from "../features/mock/mockData";

export interface StartResumeJobPayload {
  jobPostingId: number;
  projectIds: number[];
}

// api-spec.md #12 POST /resume-jobs
export async function startResumeJob(payload: StartResumeJobPayload): Promise<JobResponse> {
  await new Promise((r) => setTimeout(r, 200));
  if (payload.projectIds.length === 0) {
    throw new Error("이력서 생성에 사용할 프로젝트를 1개 이상 선택해주세요.");
  }
  return {
    jobId: 501,
    status: "pending",
    message: "이력서 초안 생성 작업이 생성되었습니다.",
    resultId: null,
    error: null,
  };
}

// api-spec.md #13 GET /resume-jobs/{jobId}
export async function getResumeJob(_jobId: number): Promise<JobResponse> {
  await new Promise((r) => setTimeout(r, 200));
  return {
    jobId: 501,
    status: "completed",
    message: "이력서 초안 생성이 완료되었습니다.",
    resultId: mockResumeResult.resumeResultId,
    error: null,
  };
}

// api-spec.md #14 GET /resume-results/{resumeResultId}
export async function getResumeResult(_resumeResultId: number): Promise<ResumeResult> {
  await new Promise((r) => setTimeout(r, 200));
  return mockResumeResult;
}
