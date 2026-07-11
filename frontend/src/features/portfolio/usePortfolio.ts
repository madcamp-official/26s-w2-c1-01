import { useState } from "react";
import type { PortfolioState } from "../../types/portfolio";

const initialState: PortfolioState = {
  githubUrls: [],
  notionUrls: [],
  pdfFiles: [],
  collectedProjects: [],
};

export function usePortfolio() {
  const [state, setState] = useState<PortfolioState>(initialState);

  const addGithubUrl = (url: string) =>
    setState((s) => ({ ...s, githubUrls: [...s.githubUrls, url] }));
  const addNotionUrl = (url: string) =>
    setState((s) => ({ ...s, notionUrls: [...s.notionUrls, url] }));
  const removeGithubUrl = (url: string) =>
    setState((s) => ({ ...s, githubUrls: s.githubUrls.filter((u) => u !== url) }));
  const removeNotionUrl = (url: string) =>
    setState((s) => ({ ...s, notionUrls: s.notionUrls.filter((u) => u !== url) }));
  const addPdfFiles = (files: File[]) =>
    setState((s) => ({ ...s, pdfFiles: [...s.pdfFiles, ...files] }));

  return { state, addGithubUrl, addNotionUrl, removeGithubUrl, removeNotionUrl, addPdfFiles };
}
