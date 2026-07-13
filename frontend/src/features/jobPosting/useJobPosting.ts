import { useState } from "react";
import type { JobPostingMode, JobPostingState } from "../../types/jobPosting";

const initialState: JobPostingState = {
  mode: "url",
  url: "",
  rawText: "",
  imageDataUrls: [],
  imageNames: [],
};

export function useJobPosting() {
  const [state, setState] = useState<JobPostingState>(initialState);

  const setMode = (mode: JobPostingMode) => setState((s) => ({ ...s, mode }));
  const setUrl = (url: string) => setState((s) => ({ ...s, url }));
  const setRawText = (rawText: string) => setState((s) => ({ ...s, rawText }));
  const setImages = (imageDataUrls: string[], imageNames: string[]) =>
    setState((s) => ({ ...s, imageDataUrls, imageNames }));

  return { state, setMode, setUrl, setRawText, setImages };
}
