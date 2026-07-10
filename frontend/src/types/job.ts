// docs/api-spec.md 1. 공통 규칙 - 작업 상태값 / 공통 작업 응답
export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface JobError {
  code: string;
  detail: string;
}

export interface JobResponse {
  jobId: number;
  status: JobStatus;
  message: string;
  resultId: number | null;
  error: JobError | null;
}
