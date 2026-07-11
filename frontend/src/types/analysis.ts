export type AnalysisStatus = "idle" | "running" | "done";

export interface AnalysisStep {
  label: string;
  at: number;
}

export interface AnalysisState {
  status: AnalysisStatus;
  progress: number;
  currentStep: number;
}
