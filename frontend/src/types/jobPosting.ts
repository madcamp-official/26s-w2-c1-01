export type JobPostingInputType = "url" | "text";
export type JobPostingMode = JobPostingInputType;

export interface JobPostingState {
  mode: JobPostingMode;
  url: string;
  rawText: string;
}

export interface JobPosting {
  jobPostingId: number;
  inputType: JobPostingInputType;
  rawText: string;
  status: "completed" | "failed";
}

// 분석 완료 시 함께 내려오는 구조화된 공고 정보 — api-spec #11
export interface ParsedJobPosting {
  jobPostingId: number;
  companyName: string;
  role: string;
  requiredSkills: string[];
  preferredSkills: string[];
  competencies: string[];
}
