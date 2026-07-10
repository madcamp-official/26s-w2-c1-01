import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { getEvidence } from "../api/evidence";
import { ApiError } from "../api/client";
import type { Evidence } from "../types/evidence";
import "./EvidenceModal.css";

export function EvidenceModal({ evidenceIds, onClose }: { evidenceIds: number[]; onClose: () => void }) {
  const { accessToken } = useAuth();
  const [evidences, setEvidences] = useState<Evidence[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    Promise.all(evidenceIds.map((id) => getEvidence(accessToken, id)))
      .then((results) => {
        if (!cancelled) setEvidences(results);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "근거를 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, evidenceIds]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="evidence-modal-overlay" onClick={onClose}>
      <div className="evidence-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header className="evidence-modal-header">
          <h2>근거 보기</h2>
          <button type="button" className="evidence-modal-close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>

        {error && <p className="evidence-modal-error">{error}</p>}
        {!error && !evidences && <p className="evidence-modal-loading">근거를 불러오는 중...</p>}

        {evidences && (
          <div className="evidence-modal-list">
            {evidences.map((evidence) => (
              <article key={evidence.evidenceId} className="evidence-card">
                <h3>{evidence.title}</h3>
                <a href={evidence.sourceUrl} target="_blank" rel="noreferrer" className="evidence-source-link">
                  {evidence.sourceUrl}
                </a>
                <p className="evidence-content">{evidence.content}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
