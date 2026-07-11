import type { ResumeSentence } from "../types/result";
import "./EvidenceAccordion.css";

interface EvidenceAccordionProps {
  sentence: ResumeSentence;
  open: boolean;
  onToggle: () => void;
}

export function EvidenceAccordion({ sentence, open, onToggle }: EvidenceAccordionProps) {
  return (
    <div className="evidence-card">
      <div className="evidence-card__row">
        <p className="evidence-card__text">{sentence.text}</p>
        <div className="evidence-card__buttons">
          <button className="evidence-card__copy">복사</button>
          <button
            className={`evidence-card__toggle${open ? " evidence-card__toggle--active" : ""}`}
            onClick={onToggle}
          >
            {open ? "근거 닫기" : "근거 보기"}
          </button>
        </div>
      </div>
      {open && (
        <div className="evidence-card__quote">
          <p className="evidence-card__quote-ref">원문 출처 · {sentence.srcRef}</p>
          <p className="evidence-card__quote-text">"{sentence.srcQuote}"</p>
        </div>
      )}
    </div>
  );
}
