import type { AnalysisResult } from "../types/result";
import { mockResult } from "../features/mock/mockData";

// TODO: GET /results/:id — 매칭도·순위·문장 초안·부족 역량 조회
// srcRef/srcQuote는 항상 원문 근거와 연결되어야 함 (할루시네이션 방지)
export async function fetchResult(_id: string): Promise<AnalysisResult> {
  await new Promise((r) => setTimeout(r, 200));
  return mockResult;
}
