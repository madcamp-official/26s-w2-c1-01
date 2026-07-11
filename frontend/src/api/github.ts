import type { JobResponse } from "../types/job";
import type { CollectedProjectCandidate } from "../types/project";
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
