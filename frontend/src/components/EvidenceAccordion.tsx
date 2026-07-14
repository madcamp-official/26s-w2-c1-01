import type { MatchEvidence } from "../types/analysis";
import type { ResumeSection } from "../types/resume";
import "./EvidenceAccordion.css";

interface EvidenceAccordionProps {
  section: ResumeSection;
  matchEvidence: MatchEvidence[];
  open: boolean;
  onToggle: () => void;
}

export function EvidenceAccordion({ section }: EvidenceAccordionProps) {
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
        </div>
      </div>
    </div>
  );
}
