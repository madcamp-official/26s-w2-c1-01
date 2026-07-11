export type ProjectSource = "GitHub" | "Notion" | "PDF 이력서";

export interface Project {
  id: string;
  title: string;
  role: string;
  stack: string[];
  problem: string;
  result: string;
  source: ProjectSource;
  excluded: boolean;
}
