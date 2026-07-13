import type { JobResponse } from "./job";
import type { ParsedJobPosting } from "./jobPosting";

export type AnalysisStatus = "running" | "done" | "failed";

export interface AnalysisStep {
  label: string;
  at: number;
}

export interface MatchEvidence {
  requirement: string;
  matchType: "skill" | "semantic" | "missing";
  source: string;
  projectEvidence: string;
  explanation: string;
}

// 추천 프로젝트 — api-spec #11 recommendedProjects
export interface RecommendedProject {
  projectId: number;
  title: string;
  score: number;
  reason: string;
  matchedSkills: string[];
  missingSkills: string[];
  matchEvidence?: MatchEvidence[];
  evidenceIds: number[];
}

// GET /analysis-jobs/{jobId} 완료 응답
export interface AnalysisJobResult extends JobResponse {
  jobPosting?: ParsedJobPosting;
  recommendedProjects?: RecommendedProject[];
}
