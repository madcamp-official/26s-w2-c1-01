import type { JobResponse } from "./job";

// docs/api-spec.md 11. 공고 분석 상태 및 결과 조회
export interface JobPostingSummary {
  jobPostingId: number;
  companyName: string;
  role: string;
  requiredSkills: string[];
  preferredSkills: string[];
  competencies: string[];
}

export interface RecommendedProject {
  projectId: number;
  title: string;
  score: number;
  reason: string;
  matchedSkills: string[];
  missingSkills: string[];
  evidenceIds: number[];
}

export interface AnalysisJobResponse extends JobResponse {
  jobPosting?: JobPostingSummary;
  recommendedProjects?: RecommendedProject[];
}
