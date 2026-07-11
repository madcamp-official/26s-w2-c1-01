export interface AnalysisProgressEvent {
  progress: number;
  currentStep: number;
}

// TODO: POST /analysis/run — 활성 프로젝트 id 목록으로 분석 시작, 분석 job id 반환
export async function startAnalysis(_projectIds: string[]): Promise<{ jobId: string }> {
  await new Promise((r) => setTimeout(r, 200));
  return { jobId: "mock-job-1" };
}

// TODO: GET /analysis/:jobId/stream — SSE로 진행률 구독 (권장). 폴백은 폴링 GET /analysis/:jobId
export function subscribeAnalysisProgress(
  _jobId: string,
  _onProgress: (event: AnalysisProgressEvent) => void,
): () => void {
  // 실제 구현 예시:
  // const es = new EventSource(`${API_BASE_URL}/analysis/${jobId}/stream`);
  // es.onmessage = (e) => onProgress(JSON.parse(e.data));
  // return () => es.close();
  return () => {};
}
