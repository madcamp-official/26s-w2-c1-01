import type { MatchEvidence } from "../types/analysis";
import type { ResumeSection } from "../types/resume";
import "./EvidenceAccordion.css";

interface EvidenceAccordionProps {
  section: ResumeSection;
  matchEvidence: MatchEvidence[];
  open: boolean;
  onToggle: () => void;
}

const matchTypeLabel: Record<MatchEvidence["matchType"], string> = {
  skill: "일치 근거",
  semantic: "맥락 근거",
  missing: "보완 필요",
};

export function EvidenceAccordion({ section, matchEvidence, open, onToggle }: EvidenceAccordionProps) {
  const handleToggle = () => {
    onToggle();
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
          {matchEvidence.length === 0 && (
            <p className="evidence-card__quote-loading">이 섹션에 연결된 매칭 근거가 아직 없어요.</p>
          )}
          {matchEvidence.map((item, index) => (
            <div
              className={`evidence-card__quote evidence-card__quote--${item.matchType}`}
              key={`${item.requirement}-${item.matchType}-${index}`}
            >
              <div className="evidence-card__quote-head">
                <span className="evidence-card__quote-ref">
                  {matchTypeLabel[item.matchType]} · {item.requirement}
                </span>
                <span className="evidence-card__quote-source">{item.source}</span>
              </div>
              <p className="evidence-card__quote-text">{item.projectEvidence}</p>
              <p className="evidence-card__quote-explanation">{item.explanation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
