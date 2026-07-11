import type { JobResponse } from "../types/job";
import type { CollectedProjectCandidate } from "../types/project";
import { mockProjects } from "../features/mock/mockData";

export interface GithubCollectionJobResult extends JobResponse {
  projects?: CollectedProjectCandidate[];
}

// api-spec.md #5 POST /github/collection-jobs
export async function startGithubCollection(agreedToAnalyze: true): Promise<JobResponse> {
  await new Promise((r) => setTimeout(r, 200));
  if (!agreedToAnalyze) {
    throw new Error("agreedToAnalyze must be true");
  }
  return {
    jobId: 101,
    status: "pending",
    message: "GitHub 프로젝트 수집 작업이 생성되었습니다.",
    resultId: null,
    error: null,
  };
}

// api-spec.md #6 GET /github/collection-jobs/{jobId}
export async function getGithubCollectionJob(_jobId: number): Promise<GithubCollectionJobResult> {
  await new Promise((r) => setTimeout(r, 200));
  return {
    jobId: 101,
    status: "completed",
    message: "GitHub 프로젝트 수집이 완료되었습니다.",
    resultId: null,
    error: null,
    projects: mockProjects.map((p) => ({
      projectId: p.projectId,
      title: p.title,
      description: p.description,
      skills: p.skills,
      sourceType: p.sourceType,
      sourceUrl: p.sourceUrl,
    })),
  };
}
