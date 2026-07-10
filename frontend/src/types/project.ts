export interface Project {
  projectId: number;
  title: string;
  description: string;
  role: string;
  skills: string[];
  achievements: string[];
  sourceType: string;
  sourceUrl: string;
  evidenceIds: number[];
}

export interface ProjectUpdateInput {
  title: string;
  description: string;
  role: string;
  skills: string[];
  achievements: string[];
}
