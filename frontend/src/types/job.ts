// 공통 작업 상태값 (api-spec.md #작업 상태값)
export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface JobError {
  code: string;
  detail: string;
}

// 공통 작업 응답 (api-spec.md #공통 작업 응답)
export interface JobResponse {
  jobId: number;
  status: JobStatus;
  message: string;
  resultId: number | null;
  error: JobError | null;
}
