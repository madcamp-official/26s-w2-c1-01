import type { Project } from "./project";

export interface PortfolioState {
  githubUrls: string[];
  notionUrls: string[];
  pdfFiles: File[];
  collectedProjects: Project[];
}

export interface ConnectedSource {
  id: string;
  type: "GitHub" | "Notion" | "PDF";
  label: string;
  connected: boolean;
}
