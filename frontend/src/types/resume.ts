// docs/api-spec.md 14. 이력서 결과 조회
export interface ResumeSection {
  sectionType: string;
  heading: string;
  content: string;
  evidenceIds: number[];
  projectId?: number;
}

export interface SuggestedProject {
  title: string;
  description: string;
  targetSkills: string[];
  estimatedDuration: string;
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
