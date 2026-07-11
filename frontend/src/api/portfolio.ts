import type { Project } from "../types/project";
import { mockProjects } from "../features/mock/mockData";

export interface CollectPortfolioPayload {
  githubUrls: string[];
  notionUrls: string[];
  pdfFiles: File[];
}

// TODO: POST /portfolio/collect — GitHub/Notion/PDF에서 프로젝트 후보 배열 수집
export async function collectPortfolio(
  _payload: CollectPortfolioPayload,
): Promise<Project[]> {
  await new Promise((r) => setTimeout(r, 300));
  return mockProjects;
}
