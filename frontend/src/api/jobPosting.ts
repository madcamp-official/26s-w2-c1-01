import type { JobPostingMode, ParsedJobPosting } from "../types/jobPosting";

export interface RegisterJobPostingPayload {
  mode: JobPostingMode;
  url?: string;
  images?: File[];
  rawText?: string;
}

// TODO: POST /job-postings — URL/이미지/텍스트를 구조화 JSON(회사·직무·요구역량)으로 파싱
export async function registerJobPosting(
  _payload: RegisterJobPostingPayload,
): Promise<ParsedJobPosting> {
  await new Promise((r) => setTimeout(r, 300));
  return {
    company: "핀테크 스타트업 A사",
    role: "프론트엔드 개발자",
    responsibilities: [],
    requirements: [],
    preferred: [],
  };
}
