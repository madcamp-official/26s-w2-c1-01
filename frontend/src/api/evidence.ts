import type { Evidence } from "../types/evidence";
import { mockEvidences } from "../features/mock/mockData";

// api-spec.md #15 GET /evidences/{evidenceId}
export async function getEvidence(evidenceId: number): Promise<Evidence> {
  await new Promise((r) => setTimeout(r, 150));
  const evidence = mockEvidences[evidenceId];
  if (!evidence) throw new Error(`Evidence ${evidenceId} not found`);
  return evidence;
}
