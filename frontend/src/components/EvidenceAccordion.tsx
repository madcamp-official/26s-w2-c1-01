import { useState } from "react";
import type { ResumeSection } from "../types/resume";
import type { Evidence } from "../types/evidence";
import { getEvidence } from "../api/evidence";
import "./EvidenceAccordion.css";

interface EvidenceAccordionProps {
  section: ResumeSection;
  open: boolean;
  onToggle: () => void;
}

export function EvidenceAccordion({ section, open, onToggle }: EvidenceAccordionProps) {
  const [evidences, setEvidences] = useState<Evidence[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    onToggle();
    if (!open && evidences === null && section.evidenceIds.length > 0) {
      setLoading(true);
      // api-spec.md #15 GET /evidences/{evidenceId}
      const results = await Promise.all(section.evidenceIds.map((id) => getEvidence(id)));
      setEvidences(results);
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(section.content).catch(() => {});
  };

  return (
    <div className="evidence-card">
      <div className="evidence-card__row">
        <div className="evidence-card__body">
          <span className="evidence-card__badge">{section.heading}</span>
          <p className="evidence-card__text">{section.content}</p>
        </div>
        <div className="evidence-card__buttons">
          <button className="evidence-card__copy" onClick={handleCopy}>
            복사
          </button>
          <button
            className={`evidence-card__toggle${open ? " evidence-card__toggle--active" : ""}`}
            onClick={handleToggle}
          >
            {open ? "근거 닫기" : "근거 보기"}
          </button>
        </div>
      </div>
      {open && (
        <div className="evidence-card__quote-list">
          {loading && <p className="evidence-card__quote-loading">근거를 불러오는 중이에요...</p>}
          {evidences?.map((ev) => (
            <div className="evidence-card__quote" key={ev.evidenceId}>
              <p className="evidence-card__quote-ref">원문 근거 · {ev.title}</p>
              <p className="evidence-card__quote-text">"{ev.content}"</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
