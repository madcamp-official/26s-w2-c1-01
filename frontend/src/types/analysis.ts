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

export interface CvFitSectionEvidence {
  sectionType: string;
  title: string;
  matchedSkills: string[];
  content: string;
}

export interface CvFit {
  score: number;
  summary?: string;
  matchedSkills: string[];
  missingSkills: string[];
  sectionEvidence: CvFitSectionEvidence[];
  ruleScore?: number | null;
  vectorScore?: number | null;
}

export interface AnalysisJobResult extends JobResponse {
  jobPosting?: ParsedJobPosting;
  cvFit?: CvFit | null;
  recommendedProjects?: RecommendedProject[];
}
