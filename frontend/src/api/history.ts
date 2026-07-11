import type { HistoryEntry } from "../types/history";
import { mockHistory } from "../features/mock/mockData";

// TODO: GET /history — 로그인 사용자의 분석 기록 목록 조회
export async function fetchHistory(): Promise<HistoryEntry[]> {
  await new Promise((r) => setTimeout(r, 200));
  return mockHistory;
}
