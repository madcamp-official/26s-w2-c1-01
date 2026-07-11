import type { JobPosting, JobPostingInputType } from "../types/jobPosting";

export interface RegisterJobPostingPayload {
  inputType: JobPostingInputType;
  content: string;
}

// api-spec.md #9 POST /job-postings
// URL 인식 실패(JOB_POSTING_URL_FETCH_FAILED) 시 프론트는 텍스트 입력으로 안내해야 함
export async function registerJobPosting(payload: RegisterJobPostingPayload): Promise<JobPosting> {
  await new Promise((r) => setTimeout(r, 300));
  return {
    jobPostingId: 201,
    inputType: payload.inputType,
    rawText: payload.content,
    status: "completed",
  };
}
