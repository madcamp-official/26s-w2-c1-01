import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getResumeResult } from "../api/resume";
import { ApiError } from "../api/client";
import { EvidenceModal } from "../components/EvidenceModal";
import type { ResumeResult } from "../types/resume";
import "./ResumeResultPage.css";

export function ResumeResultPage() {
  const { resumeResultId } = useParams<{ resumeResultId: string }>();
  const { accessToken } = useAuth();
  const [result, setResult] = useState<ResumeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openEvidenceIds, setOpenEvidenceIds] = useState<number[] | null>(null);

  useEffect(() => {
    if (!accessToken || !resumeResultId) return;
    let cancelled = false;
    getResumeResult(accessToken, Number(resumeResultId))
      .then((res) => {
        if (!cancelled) setResult(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "이력서 결과를 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, resumeResultId]);

  if (error) {
    return (
      <section className="resume-result-page">
        <p className="resume-result-error">{error}</p>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="resume-result-page">
        <p>이력서 결과를 불러오는 중...</p>
      </section>
    );
  }

  return (
    <section className="resume-result-page">
      <div className="resume-result-card">
        <h1>{result.title}</h1>
        <p className="resume-result-summary">{result.summary}</p>

        {result.warnings.length > 0 && (
          <div className="resume-warning-box">
            {result.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        )}

        <div className="resume-sections">
          {result.sections.map((section, index) => (
            <article key={`${section.sectionType}-${index}`} className="resume-section-card">
              <h2>{section.heading}</h2>
              <p>{section.content}</p>
              {section.evidenceIds.length > 0 && (
                <button
                  type="button"
                  className="evidence-view-button"
                  onClick={() => setOpenEvidenceIds(section.evidenceIds)}
                >
                  근거 보기
                </button>
              )}
            </article>
          ))}
        </div>

        {result.missingSkills.length > 0 && (
          <div className="resume-missing-skills">
            <h2>부족한 역량</h2>
            <div className="resume-tag-list">
              {result.missingSkills.map((skill) => (
                <span key={skill} className="resume-tag resume-tag-missing">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {result.suggestedProjects.length > 0 && (
          <div className="resume-suggested-projects">
            <h2>보완 프로젝트 제안</h2>
            <div className="suggested-project-list">
              {result.suggestedProjects.map((project) => (
                <article key={project.title} className="suggested-project-card">
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                  <div className="resume-tag-list">
                    {project.targetSkills.map((skill) => (
                      <span key={skill} className="resume-tag">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <p className="suggested-project-meta">예상 기간: {project.estimatedDuration}</p>
                  <p className="suggested-project-reason">{project.reason}</p>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
      {openEvidenceIds && (
        <EvidenceModal evidenceIds={openEvidenceIds} onClose={() => setOpenEvidenceIds(null)} />
      )}
    </section>
  );
}
