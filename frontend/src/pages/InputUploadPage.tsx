import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header, PageContainer } from "../components/Layout";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { SegmentedControl } from "../components/SegmentedControl";
import { Chip } from "../components/Chip";
import { useJobPosting } from "../features/jobPosting/useJobPosting";
import { usePortfolio } from "../features/portfolio/usePortfolio";
import "./InputUploadPage.css";

const jobModeOptions = [
  { value: "url" as const, label: "URL로 등록" },
  { value: "image" as const, label: "이미지 업로드" },
  { value: "text" as const, label: "직접 입력" },
];

export function InputUploadPage() {
  const navigate = useNavigate();
  const { state: jobState, setMode, setUrl, setRawText } = useJobPosting();
  const {
    state: portfolioState,
    addGithubUrl,
    addNotionUrl,
    removeGithubUrl,
    removeNotionUrl,
  } = usePortfolio();
  const [githubInput, setGithubInput] = useState("");
  const [notionInput, setNotionInput] = useState("");

  const handleAddGithub = () => {
    if (!githubInput.trim()) return;
    addGithubUrl(githubInput.trim());
    setGithubInput("");
  };

  const handleAddNotion = () => {
    if (!notionInput.trim()) return;
    addNotionUrl(notionInput.trim());
    setNotionInput("");
  };

  return (
    <>
      <Header />
      <PageContainer maxWidth={760}>
        <p className="input-eyebrow">채용공고 맞춤 이력서 추천</p>
        <h1 className="input-title">
          공고에 딱 맞는 이력서,
          <br />
          3분이면 충분해요
        </h1>
        <p className="input-subtitle">
          채용공고와 포트폴리오를 등록하면
          <br />
          강조할 경험과 이력서 문장을 근거와 함께 추천해 드려요.
        </p>

        <Card style={{ marginBottom: 20 }}>
          <div className="input-card-head">
            <span className="input-card-title">채용공고 등록</span>
            <span className="input-step-badge">STEP 1</span>
          </div>
          <p className="input-card-desc">URL이 막혀 있으면 이미지나 직접 입력으로 등록할 수 있어요.</p>

          <SegmentedControl options={jobModeOptions} value={jobState.mode} onChange={setMode} />

          {jobState.mode === "url" && (
            <div className="input-field-stack">
              <input
                type="url"
                placeholder="채용공고 URL을 붙여넣어 주세요 (예: https://careers.company.com/job/1234)"
                className="input-text-field"
                value={jobState.url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <div className="input-hint">
                <span className="input-hint__dot" />
                담당 업무 · 자격 요건 · 우대 사항을 자동으로 추출해요
              </div>
            </div>
          )}

          {jobState.mode === "image" && (
            <div className="input-dropzone">
              <div className="input-dropzone__icon">↑</div>
              <p className="input-dropzone__title">공고 캡처 이미지를 올려주세요</p>
              <p className="input-dropzone__desc">PNG · JPG · 최대 10MB, 여러 장도 괜찮아요</p>
            </div>
          )}

          {jobState.mode === "text" && (
            <textarea
              rows={6}
              placeholder="공고 내용을 그대로 붙여넣어 주세요. 회사명, 직무, 담당 업무, 자격 요건, 우대 사항이 포함되면 더 정확해요."
              className="input-textarea"
              value={jobState.rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
          )}
        </Card>

        <Card>
          <div className="input-card-head">
            <span className="input-card-title">포트폴리오 등록</span>
            <span className="input-step-badge">STEP 2</span>
          </div>
          <p className="input-card-desc">여러 개를 등록할수록 추천이 정확해져요.</p>

          <div className="input-field-stack" style={{ marginBottom: 16 }}>
            <div className="input-url-row">
              <span className="input-url-row__label">GitHub</span>
              <input
                type="url"
                placeholder="https://github.com/username"
                className="input-url-row__field"
                value={githubInput}
                onChange={(e) => setGithubInput(e.target.value)}
              />
              <button className="input-url-row__btn" onClick={handleAddGithub}>
                추가
              </button>
            </div>
            <div className="input-url-row">
              <span className="input-url-row__label">Notion</span>
              <input
                type="url"
                placeholder="공개된 Notion 포트폴리오 URL"
                className="input-url-row__field"
                value={notionInput}
                onChange={(e) => setNotionInput(e.target.value)}
              />
              <button className="input-url-row__btn" onClick={handleAddNotion}>
                추가
              </button>
            </div>
          </div>

          <div className="input-dropzone input-dropzone--small">
            <p className="input-dropzone__title">PDF 이력서 끌어다 놓기</p>
            <p className="input-dropzone__desc">기존 이력서가 있다면 함께 분석해 드려요</p>
          </div>

          <div className="input-chip-row">
            {portfolioState.githubUrls.map((url) => (
              <Chip key={url} onRemove={() => removeGithubUrl(url)}>
                {url}
              </Chip>
            ))}
            {portfolioState.notionUrls.map((url) => (
              <Chip key={url} onRemove={() => removeNotionUrl(url)}>
                {url}
              </Chip>
            ))}
          </div>
        </Card>
      </PageContainer>

      <div className="input-fixed-cta">
        <Button variant="primary" size="lg" className="input-fixed-cta__btn" onClick={() => navigate("/projects")}>
          자료 수집하고 프로젝트 확인하기 →
        </Button>
      </div>
    </>
  );
}
