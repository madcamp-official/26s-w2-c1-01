export type ResumeSectionType = "profile_summary" | "skills" | "project";

export interface ResumeSection {
  sectionType: ResumeSectionType;
  heading: string;
  content: string;
  projectId?: number;
  evidenceIds: number[];
}

// 부족 역량을 보완할 제안 프로젝트 — api-spec #14 suggestedProjects
export interface SuggestedProject {
  title: string;
  description: string;
  targetSkills: string[];
  estimatedDuration?: string | null;
  reason: string;
}

export interface ResumeResult {
  resumeResultId: number;
  jobPostingId: number;
  title: string;
  summary: string;
  sections: ResumeSection[];
  missingSkills: string[];
  suggestedProjects: SuggestedProject[];
  warnings: string[];
  createdAt: string;
}
