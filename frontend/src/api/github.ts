import { apiRequest } from "./client";
import type { JobResponse } from "../types/job";

// docs/api-spec.md 5. GitHub 프로젝트 수집 시작
export function startGithubCollection(accessToken: string, agreedToAnalyze: boolean) {
  return apiRequest<JobResponse>("/github/collection-jobs", {
    method: "POST",
    accessToken,
    body: { agreedToAnalyze },
  });
}

// docs/api-spec.md 6. GitHub 프로젝트 수집 상태 조회
export function getGithubCollectionJob(accessToken: string, jobId: number) {
  return apiRequest<JobResponse>(`/github/collection-jobs/${jobId}`, { accessToken });
}
