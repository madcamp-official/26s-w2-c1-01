import type { JobResponse } from "./job";
import type { ParsedJobPosting } from "./jobPosting";

export type AnalysisStatus = "running" | "done" | "failed";

export interface AnalysisStep {
  label: string;
  at: number;
}

// 추천 프로젝트 — api-spec #11 recommendedProjects
export interface RecommendedProject {
  projectId: number;
  title: string;
  score: number;
  reason: string;
  matchedSkills: string[];
  missingSkills: string[];
  evidenceIds: number[];
}

// GET /analysis-jobs/{jobId} 완료 응답
export interface AnalysisJobResult extends JobResponse {
  jobPosting?: ParsedJobPosting;
  recommendedProjects?: RecommendedProject[];
}
