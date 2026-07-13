import type { JobPosting, JobPostingInputType } from "../types/jobPosting";
import { apiFetch } from "./client";

export interface RegisterJobPostingPayload {
  inputType: JobPostingInputType;
  content: string | string[];
}

// api-spec.md #9 POST /job-postings
// URL 인식 실패(JOB_POSTING_URL_FETCH_FAILED) 시 프론트는 텍스트 입력으로 안내해야 함
export function registerJobPosting(payload: RegisterJobPostingPayload): Promise<JobPosting> {
  return apiFetch<JobPosting>("/job-postings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
