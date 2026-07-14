export type ProjectSourceType = "github" | "notion" | "pdf" | "cv";

// GitHub 수집 단계에서 나오는 후보 — api-spec #6
export interface CollectedProjectCandidate {
  projectId: number;
  title: string;
  description: string;
  skills: string[];
  sourceType: ProjectSourceType;
  sourceUrl: string;
}

// API 응답용 — api-spec #7, #8
export interface ApiProject {
  projectId: number;
  title: string;
  description: string;
  role: string;
  skills: string[];
  achievements: string[];
  sourceType: ProjectSourceType;
  sourceUrl: string;
  evidenceIds: number[];
}

export type Project = ApiProject;

// 이력서 생성 대상 제외 여부 — API에는 없고 프론트에서만 관리, 이력서 생성 시 projectIds 선택으로 대응 (api-spec #12)
export interface EditableProject extends ApiProject {
  excluded: boolean;
}
