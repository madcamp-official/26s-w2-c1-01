import { apiRequest } from "./client";
import type { Project, ProjectUpdateInput } from "../types/project";

// docs/api-spec.md 7. 프로젝트 목록 조회
export function fetchProjects(accessToken: string) {
  return apiRequest<{ projects: Project[] }>("/projects", { accessToken });
}

// docs/api-spec.md 8. 프로젝트 수정
export function updateProject(accessToken: string, projectId: number, input: ProjectUpdateInput) {
  return apiRequest<Project & { updatedAt: string }>(`/projects/${projectId}`, {
    method: "PATCH",
    accessToken,
    body: input,
  });
}
