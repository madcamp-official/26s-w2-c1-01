import type { ApiProject } from "../types/project";
import { mockProjects } from "../features/mock/mockData";

// api-spec.md #7 GET /projects
export async function fetchProjects(): Promise<ApiProject[]> {
  await new Promise((r) => setTimeout(r, 200));
  return mockProjects;
}

export interface UpdateProjectPayload {
  title?: string;
  description?: string;
  role?: string;
  skills?: string[];
  achievements?: string[];
}

// api-spec.md #8 PATCH /projects/{projectId}
export async function updateProject(
  projectId: number,
  patch: UpdateProjectPayload,
): Promise<ApiProject> {
  await new Promise((r) => setTimeout(r, 150));
  const existing = mockProjects.find((p) => p.projectId === projectId) ?? mockProjects[0];
  return { ...existing, ...patch };
}
