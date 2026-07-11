import type { Project } from "../types/project";
import { mockProjects } from "../features/mock/mockData";

// TODO: GET /projects — 현재 세션의 수집된 프로젝트 목록 조회
export async function fetchProjects(): Promise<Project[]> {
  await new Promise((r) => setTimeout(r, 200));
  return mockProjects;
}

// TODO: PATCH /projects/:id — 인라인 편집(제목/역할/스택/문제/성과) 저장
export async function updateProject(_id: string, _patch: Partial<Project>): Promise<void> {
  await new Promise((r) => setTimeout(r, 150));
}

// TODO: POST /projects/merge — 여러 프로젝트를 하나로 병합
export async function mergeProjects(_ids: string[]): Promise<Project> {
  await new Promise((r) => setTimeout(r, 200));
  return mockProjects[0];
}
