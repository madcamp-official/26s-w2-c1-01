import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header, PageContainer } from "../components/Layout";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { EvidenceAccordion } from "../components/EvidenceAccordion";
import { useAuth } from "../features/auth/useAuth";
import { useRecommendationResult } from "../features/result/useRecommendationResult";
import "./RecommendationResultPage.css";

function cleanResumeText(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) =>
      line
        .trim()
        .replace(/^#+\s*/, "")
        .replace(/^[-*•]\s+/, "")
        .replace(/^\d+\.\s+/, "")
        .replace(/\*\*/g, "")
        .replace(/__/g, "")
        .replace(/```/g, "")
        .replace(/^`|`$/g, ""),
    )
    .filter(Boolean)
    .join(" ");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function RecommendationResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const jobId = id ? Number(id) : undefined;
  const { analysis, analysisLoading, resume, resumeLoading } = useRecommendationResult(jobId);

  const sortedProjects = useMemo(
    () => (analysis ? [...analysis.recommendedProjects].sort((a, b) => b.score - a.score) : []),
    [analysis],
  );

  const topScore = sortedProjects[0]?.score ?? 0;
  const isGoodMatch = topScore >= 70;

  const skillCoverage = useMemo(() => {
    if (!analysis) return null;
    const matched = new Set(analysis.recommendedProjects.flatMap((p) => p.matchedSkills));
    const { requiredSkills, preferredSkills } = analysis.jobPosting;
    const matchedCount =
      requiredSkills.filter((s) => matched.has(s)).length +
      preferredSkills.filter((s) => matched.has(s)).length;
    return { matched, matchedCount, total: requiredSkills.length + preferredSkills.length };
  }, [analysis]);

  const handleCopyMarkdown = () => {
    if (!resume) return;
    const markdown = [
      `# ${cleanResumeText(resume.title)}`,
      "",
      cleanResumeText(resume.summary),
      "",
      ...resume.sections.map((s) => `## ${cleanResumeText(s.heading)}\n\n${cleanResumeText(s.content)}`),
    ].join("\n");
    navigator.clipboard.writeText(markdown).catch(() => {});
  };

  const handleSaveResumePdf = () => {
    if (!resume) return;

    const title = cleanResumeText(resume.title);
    const summary = cleanResumeText(resume.summary);
    const sections = resume.sections
      .map((section) => {
        const heading = escapeHtml(cleanResumeText(section.heading));
        const content = escapeHtml(cleanResumeText(section.content));
        return `
          <section class="resume-section">
            <h2>${heading}</h2>
            <p>${content}</p>
          </section>
        `;
      })
      .join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!doctype html>
      <html lang="ko">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(title)}</title>
          <style>
            @page {
              size: A4;
              margin: 18mm 16mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              color: #17151f;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif;
              line-height: 1.58;
              background: #fff;
            }
            .resume-page {
              width: 100%;
            }
            .resume-header {
              border-bottom: 2px solid #17151f;
              padding-bottom: 12px;
              margin-bottom: 18px;
            }
            h1 {
              margin: 0 0 8px;
              font-size: 22px;
              line-height: 1.25;
              letter-spacing: 0;
            }
            .summary {
              margin: 0;
              font-size: 11.5px;
              color: #494654;
            }
            .resume-section {
              break-inside: avoid;
              page-break-inside: avoid;
              margin: 0 0 15px;
              padding-bottom: 13px;
              border-bottom: 1px solid #ddd9e5;
            }
            .resume-section:last-child {
              border-bottom: none;
            }
            h2 {
              margin: 0 0 6px;
              font-size: 14px;
              line-height: 1.3;
              color: #1f1a2d;
              letter-spacing: 0;
            }
            p {
              margin: 0;
              font-size: 11.5px;
              color: #272331;
              white-space: pre-wrap;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <main class="resume-page">
            <header class="resume-header">
              <h1>${escapeHtml(title)}</h1>
              ${summary ? `<p class="summary">${escapeHtml(summary)}</p>` : ""}
            </header>
            ${sections}
          </main>
          <script>
            window.addEventListener("load", () => {
              window.focus();
              window.print();
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (analysisLoading || !analysis || !skillCoverage) {
    return (
      <>
        <Header />
        <PageContainer maxWidth={1040} centered paddingTop={110}>
          <p style={{ color: "var(--ink-sub)" }}>결과를 불러오는 중이에요...</p>
        </PageContainer>
      </>
    );
  }

  const { jobPosting } = analysis;
  const cvFit = analysis.cvFit;

  return (
    <>
      <Header />
      <PageContainer maxWidth={1040} paddingTop={56}>
        <div className="result-header">
          <div>
            <p className="result-header__eyebrow">
              {jobPosting.companyName} · {jobPosting.role} 공고 기준
            </p>
            <h1 className="result-header__title">
              이 공고, {user?.name ?? "회원"}님과
              <br />
              <span className="result-header__title-accent">
                {isGoodMatch ? "잘 맞는 편이에요" : "보완이 필요해요"}
              </span>
            </h1>
          </div>
          <div className="result-header__actions">
            <Button variant="outline" disabled={!resume} onClick={handleCopyMarkdown}>
              Markdown 복사
            </Button>
            <Button variant="dark" disabled={!resume} onClick={handleSaveResumePdf}>
              PDF로 저장
            </Button>
          </div>
        </div>

        {cvFit && (
          <Card style={{ marginBottom: 20, padding: 28 }}>
            <div className="result-cv-fit">
              <div className="result-cv-fit__score-block">
                <p className="result-cv-fit__label">CV 기반 지원자 적합도</p>
                <p className="result-cv-fit__score">
                  {cvFit.score}
                  <span>점</span>
                </p>
                <p className="result-cv-fit__summary">
                  {cvFit.summary ?? "업로드한 CV 전체를 공고와 비교한 별도 적합도입니다."}
                </p>
              </div>
              <div className="result-cv-fit__details">
                <div>
                  <p className="result-cv-fit__section-title">CV에서 확인된 기술</p>
                  <div className="result-cv-fit__chips">
                    {cvFit.matchedSkills.length > 0 ? (
                      cvFit.matchedSkills.map((skill) => (
                        <span className="result-cv-fit__chip result-cv-fit__chip--matched" key={skill}>
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="result-cv-fit__empty">직접 매칭된 기술이 아직 없어요.</span>
                    )}
                  </div>
                </div>
                {cvFit.missingSkills.length > 0 && (
                  <div>
                    <p className="result-cv-fit__section-title">CV에서 부족한 필수 기술</p>
                    <div className="result-cv-fit__chips">
                      {cvFit.missingSkills.map((skill) => (
                        <span className="result-cv-fit__chip result-cv-fit__chip--missing" key={skill}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {cvFit.sectionEvidence.length > 0 && (
                  <div>
                    <p className="result-cv-fit__section-title">주요 근거</p>
                    <div className="result-cv-fit__evidence-list">
                      {cvFit.sectionEvidence.slice(0, 3).map((item) => (
                        <div className="result-cv-fit__evidence" key={`${item.title}-${item.content}`}>
                          <span className="result-cv-fit__evidence-title">
                            {item.title} · {item.matchedSkills.join(", ")}
                          </span>
                          <span className="result-cv-fit__evidence-content">{item.content}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        <div className="result-top-grid">
          <Card dark style={{ padding: 32 }}>
            <p className="result-match__label">요구 기술 충족 현황</p>
            <p className="result-match__score">
              {skillCoverage.matchedCount}
              <span className="result-match__score-unit"> / {skillCoverage.total}</span>
            </p>

            <p className="result-match__group-label">필수 기술</p>
            <div className="result-match__chip-row">
              {jobPosting.requiredSkills.map((skill) => (
                <span
                  key={skill}
                  className={`result-match__chip${skillCoverage.matched.has(skill) ? " result-match__chip--matched" : ""}`}
                >
                  {skill}
                </span>
              ))}
            </div>

            <p className="result-match__group-label">우대 기술</p>
            <div className="result-match__chip-row">
              {jobPosting.preferredSkills.map((skill) => (
                <span
                  key={skill}
                  className={`result-match__chip${skillCoverage.matched.has(skill) ? " result-match__chip--matched" : ""}`}
                >
                  {skill}
                </span>
              ))}
            </div>

            <div className="result-match__legend">
              <span className="result-match__legend-item">
                <span className="result-match__legend-dot" style={{ background: "var(--primary)" }} />
                근거로 확인됨
              </span>
              <span className="result-match__legend-item">
                <span className="result-match__legend-dot" style={{ background: "var(--accent)" }} />
                확인되지 않음 · 보완
              </span>
            </div>
          </Card>

          <Card style={{ padding: 32 }}>
            <p className="result-rank__title">추천 프로젝트 순위</p>
            <p className="result-rank__subtitle">
              공고와 비교해 적합도 점수가 높은 순서예요. 이력서에 이 순서로 배치하세요.
            </p>
            <div className="result-rank__list">
              {sortedProjects.map((project, i) =>
                i === 0 ? (
                  <div key={project.projectId} className="result-rank__card result-rank__card--first">
                    <span className="result-rank__first-badge">1순위 · 가장 강조하세요</span>
                    <div className="result-rank__first-row">
                      <span className="result-rank__first-title">{project.title}</span>
                      <span className="result-rank__first-fit">{project.score}점</span>
                    </div>
                    <p className="result-rank__first-desc">{project.reason}</p>
                    <div className="result-rank__skill-row">
                      {project.matchedSkills.length > 0 && (
                        <span className="result-rank__skill-badge result-rank__skill-badge--matched">
                          일치: {project.matchedSkills.join(" · ")}
                        </span>
                      )}
                      {project.missingSkills.length > 0 && (
                        <span className="result-rank__skill-badge result-rank__skill-badge--missing">
                          미확인: {project.missingSkills.join(" · ")}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div key={project.projectId} className="result-rank__card">
                    <div className="result-rank__row">
                      <span className="result-rank__title-text">
                        <span className="result-rank__num">{i + 1}</span>
                        {project.title}
                      </span>
                      <span className="result-rank__fit">{project.score}점</span>
                    </div>
                    <p className="result-rank__desc">{project.reason}</p>
                  </div>
                ),
              )}
            </div>
          </Card>
        </div>

        <Card style={{ marginBottom: 20 }}>
          <p className="result-section-title">이력서 초안</p>
          <p className="result-section-subtitle">
            공고 요구사항과 추천 프로젝트를 바탕으로 바로 다듬을 수 있는 이력서 문장을 만들었어요.
          </p>
          {resumeLoading || !resume ? (
            <p style={{ color: "var(--ink-sub)", fontSize: 14 }}>이력서 초안을 만들고 있어요...</p>
          ) : (
            <>
              <div className="result-section-list">
                {resume.sections.map((section, i) => (
                  <EvidenceAccordion
                    key={`${section.heading}-${i}`}
                    section={{
                      ...section,
                      heading: cleanResumeText(section.heading),
                      content: cleanResumeText(section.content),
                    }}
                  />
                ))}
              </div>
              {(resume.warnings.length > 0 || resume.missingSkills.length > 0) && (
                <div className="result-warning">
                  <span className="result-warning__icon">!</span>
                  <div className="result-warning__body">
                    <p className="result-warning__title">보완하면 좋은 필수 기술</p>
                    {resume.missingSkills.length > 0 && (
                      <div className="result-warning__skill-list">
                        {resume.missingSkills.map((skill) => (
                          <span className="result-warning__skill" key={skill}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                    {resume.warnings.length > 0 && (
                      <p className="result-warning__text">{resume.warnings.join(" ")}</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {resume && resume.suggestedProjects.length > 0 && (
          <Card>
            <div className="result-gap-head">
              <p className="result-section-title" style={{ margin: 0 }}>
                부족 역량 리포트
              </p>
              <span className="result-gap-count">{resume.suggestedProjects.length}개 발견</span>
            </div>
            <p className="result-section-subtitle">
              공고에서 요구하지만 수집된 자료에서 확인되지 않은 역량이에요. 이 프로젝트로 채워보세요.
            </p>
            <div className="result-gap-grid">
              {resume.suggestedProjects.map((gap) => (
                <div key={gap.title} className="result-gap-card">
                  <span className="result-gap-target">목표 역량 · {gap.targetSkills.join(" · ")}</span>
                  <p className="result-gap-title">{gap.title}</p>
                  <div className="result-gap-fields">
                    <span className="result-gap-label">핵심 내용</span>
                    <span className="result-gap-value">{gap.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="result-footer">
          <Button variant="underline" onClick={() => navigate("/analyze")}>
            다른 공고로 다시 분석하기
          </Button>
        </div>
      </PageContainer>
    </>
  );
}
