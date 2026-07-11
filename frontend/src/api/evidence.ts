import type { Evidence } from "../types/evidence";
import { apiFetch } from "./client";

// api-spec.md #15 GET /evidences/{evidenceId}
export function getEvidence(evidenceId: number): Promise<Evidence> {
  return apiFetch<Evidence>(`/evidences/${evidenceId}`);
}
