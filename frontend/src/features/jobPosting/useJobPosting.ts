import { useState } from "react";
import type { JobPostingMode, JobPostingState } from "../../types/jobPosting";

const initialState: JobPostingState = {
  mode: "url",
  url: "",
  imageFiles: [],
  rawText: "",
  parsed: null,
};

export function useJobPosting() {
  const [state, setState] = useState<JobPostingState>(initialState);

  const setMode = (mode: JobPostingMode) => setState((s) => ({ ...s, mode }));
  const setUrl = (url: string) => setState((s) => ({ ...s, url }));
  const setRawText = (rawText: string) => setState((s) => ({ ...s, rawText }));
  const setImageFiles = (imageFiles: File[]) => setState((s) => ({ ...s, imageFiles }));

  return { state, setMode, setUrl, setRawText, setImageFiles };
}
