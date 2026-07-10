import { apiRequest } from "./client";
import type { JobPosting, JobPostingInputType } from "../types/jobPosting";

// docs/api-spec.md 9. 채용공고 등록
export function createJobPosting(accessToken: string, inputType: JobPostingInputType, content: string) {
  return apiRequest<JobPosting>("/job-postings", {
    method: "POST",
    accessToken,
    body: { inputType, content },
  });
}
