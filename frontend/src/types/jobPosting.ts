// docs/api-spec.md 9. 채용공고 등록
export type JobPostingInputType = "url" | "text";

export interface JobPosting {
  jobPostingId: number;
  inputType: JobPostingInputType;
  rawText: string;
  status: "completed";
}
