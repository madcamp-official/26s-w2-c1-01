import type { ApiProject } from "../types/project";
import { apiFetch } from "./client";

// api-spec.md #7 GET /projects
export async function fetchProjects(): Promise<ApiProject[]> {
  const { projects } = await apiFetch<{ projects: ApiProject[] }>("/projects");
  return projects;
}

export interface UpdateProjectPayload {
  title?: string;
  description?: string;
  role?: string;
  skills?: string[];
  achievements?: string[];
}

// api-spec.md #8 PATCH /projects/{projectId}
export function updateProject(
  projectId: number,
  patch: UpdateProjectPayload,
): Promise<ApiProject> {
  return apiFetch<ApiProject>(`/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}
