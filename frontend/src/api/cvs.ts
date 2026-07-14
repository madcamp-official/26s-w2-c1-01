import { API_BASE_URL, ApiError, apiFetch, getAccessToken } from "./client";
import type { CvDocument, CvSection } from "../types/cv";

export async function fetchCvs(): Promise<CvDocument[]> {
  const { cvs } = await apiFetch<{ cvs: CvDocument[] }>("/cvs");
  return cvs;
}

export async function uploadCv(file: File): Promise<CvDocument> {
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  const accessToken = getAccessToken();
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE_URL}/cvs/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.detail;
    const message =
      body?.message ??
      (typeof detail === "string" ? detail : detail?.message) ??
      "CV PDF 업로드에 실패했습니다.";
    const code = body?.error?.code ?? detail?.error?.code;
    throw new ApiError(message, res.status, code);
  }

  return res.json() as Promise<CvDocument>;
}

export function updateCvSection(
  sectionId: number,
  patch: Pick<CvSection, "title" | "content">,
): Promise<CvSection> {
  return apiFetch<CvSection>(`/cvs/sections/${sectionId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteCv(cvId: number): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>(`/cvs/${cvId}`, {
    method: "DELETE",
  });
}
