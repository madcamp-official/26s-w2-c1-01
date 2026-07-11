export type JobPostingMode = "url" | "image" | "text";

export interface ParsedJobPosting {
  company: string;
  role: string;
  responsibilities: string[];
  requirements: string[];
  preferred: string[];
}

export interface JobPostingState {
  mode: JobPostingMode;
  url: string;
  imageFiles: File[];
  rawText: string;
  parsed: ParsedJobPosting | null;
}
