import type { JobResponse } from "../types/job";
import type { ApiProject, CollectedProjectCandidate } from "../types/project";
import { apiFetch } from "./client";

export interface GithubCollectionJobResult extends JobResponse {
  projects?: CollectedProjectCandidate[];
}

// api-spec.md #5 POST /github/collection-jobs
export function startGithubCollection(agreedToAnalyze: true): Promise<JobResponse> {
  return apiFetch<JobResponse>("/github/collection-jobs", {
    method: "POST",
    body: JSON.stringify({ agreedToAnalyze }),
  });
}

// api-spec.md #6 GET /github/collection-jobs/{jobId}
export function getGithubCollectionJob(jobId: number): Promise<GithubCollectionJobResult> {
  return apiFetch<GithubCollectionJobResult>(`/github/collection-jobs/${jobId}`);
}

// api-spec.md #9 POST /github/repositories — organization 저장소 등 자동 수집되지 않은 레포를 수동으로 추가
export function addGithubRepository(fullName: string): Promise<ApiProject> {
  return apiFetch<ApiProject>("/github/repositories", {
    method: "POST",
    body: JSON.stringify({ fullName }),
  });
}
