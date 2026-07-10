// docs/api-spec.md 15. 근거 조회
export interface Evidence {
  evidenceId: number;
  sourceType: string;
  sourceUrl: string;
  title: string;
  content: string;
  projectId: number;
}
