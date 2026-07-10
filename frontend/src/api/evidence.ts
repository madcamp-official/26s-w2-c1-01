import { apiRequest } from "./client";
import type { Evidence } from "../types/evidence";

// docs/api-spec.md 15. 근거 조회
export function getEvidence(accessToken: string, evidenceId: number) {
  return apiRequest<Evidence>(`/evidences/${evidenceId}`, { accessToken });
}
