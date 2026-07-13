import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header, PageContainer } from "../components/Layout";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { SegmentedControl } from "../components/SegmentedControl";
import { useJobPosting } from "../features/jobPosting/useJobPosting";
import { useAuth } from "../features/auth/useAuth";
import { useProjects } from "../features/projects/useProjects";
import { startGithubCollection } from "../api/github";
import { registerJobPosting } from "../api/jobPosting";
import { ApiError } from "../api/client";
import "./InputUploadPage.css";

const jobModeOptions = [
  { value: "url" as const, label: "URL로 등록" },
  { value: "image" as const, label: "이미지 업로드" },
  { value: "text" as const, label: "직접 입력" },
];

const MAX_JOB_POSTING_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_JOB_POSTING_IMAGE_COUNT = 6;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("FileReader did not return a data URL."));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

export function InputUploadPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects } = useProjects();
  const hasExistingProjects = projects.length > 0;
  const { state: jobState, setMode, setUrl, setRawText, setImages } = useJobPosting();
  const [agreedToAnalyze, setAgreedToAnalyze] = useState(() => !hasExistingProjects);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const content =
    jobState.mode === "url"
      ? jobState.url
      : jobState.mode === "image"
        ? jobState.imageDataUrls
        : jobState.rawText;
  const hasJobPostingContent = Array.isArray(content)
    ? content.length > 0
    : content.trim().length > 0;
  // 이미 수집된 프로젝트가 있으면 체크박스는 "새 레포 추가 수집" 여부일 뿐, 필수 동의가 아니에요.
  const willCollect = hasExistingProjects ? agreedToAnalyze : true;
  const canSubmit = (hasExistingProjects || agreedToAnalyze) && hasJobPostingContent && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      if (willCollect) {
        // api-spec.md #5 POST /github/collection-jobs
        await startGithubCollection(true);
      }
      // api-spec.md #9 POST /job-postings
      const jobPosting = await registerJobPosting({
        inputType: jobState.mode,
        content: Array.isArray(content) ? content : content.trim(),
      });
      navigate("/projects", { state: { jobPostingId: jobPosting.jobPostingId } });
    } catch (err) {
      if (err instanceof ApiError && err.code === "JOB_POSTING_URL_FETCH_FAILED") {
        setMode("text");
        setErrorMessage("채용공고 URL을 읽을 수 없어요. 이미지 업로드나 직접 입력으로 등록해 주세요.");
      } else if (err instanceof ApiError && err.code === "JOB_POSTING_URL_INSUFFICIENT") {
        setMode("image");
        setErrorMessage("URL에서 핵심 자격요건을 충분히 읽지 못했어요. 공고 화면을 캡처해서 이미지로 올리거나 직접 입력해 주세요.");
      } else if (
        err instanceof ApiError &&
        (err.code === "JOB_POSTING_IMAGE_INVALID" || err.code === "JOB_POSTING_IMAGE_OCR_FAILED")
      ) {
        setErrorMessage("이미지에서 채용공고 텍스트를 읽지 못했어요. 더 선명한 이미지나 직접 입력을 사용해 주세요.");
      } else {
        setErrorMessage(err instanceof Error ? err.message : "잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageChange = async (files: FileList | null) => {
    setErrorMessage(null);
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) {
      setImages([], []);
      return;
    }
    if (selectedFiles.length > MAX_JOB_POSTING_IMAGE_COUNT) {
      setImages([], []);
      setErrorMessage(`이미지는 최대 ${MAX_JOB_POSTING_IMAGE_COUNT}장까지 업로드할 수 있어요.`);
      return;
    }
    if (selectedFiles.some((file) => !file.type.startsWith("image/"))) {
      setImages([], []);
      setErrorMessage("이미지 파일만 업로드할 수 있어요.");
      return;
    }
    if (selectedFiles.some((file) => file.size > MAX_JOB_POSTING_IMAGE_BYTES)) {
      setImages([], []);
      setErrorMessage("이미지는 8MB 이하로 업로드해 주세요.");
      return;
    }

    try {
      const imageDataUrls = await Promise.all(selectedFiles.map(readFileAsDataUrl));
      setImages(
        imageDataUrls,
        selectedFiles.map((file) => file.name),
      );
    } catch {
      setImages([], []);
      setErrorMessage("이미지를 읽지 못했어요. 다른 파일로 다시 시도해 주세요.");
    }
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
          GitHub 프로젝트를 수집하고 채용공고를 등록하면
          <br />
          강조할 경험과 이력서 초안을 근거와 함께 추천해 드려요.
        </p>

        <Card style={{ marginBottom: 20 }}>
          <div className="input-card-head">
            <span className="input-card-title">GitHub 프로젝트 수집</span>
            <span className="input-step-badge">STEP 1</span>
          </div>
          <p className="input-card-desc">
            {hasExistingProjects
              ? "이미 수집된 프로젝트가 있어요. 기존에 수정한 내용은 그대로 유지돼요."
              : "로그인한 GitHub 계정의 repository와 README를 수집해 프로젝트 후보를 만들어요."}
          </p>

          <div className="input-github-row">
            <span className="input-github-row__badge">GitHub</span>
            <span className="input-github-row__id">github.com/{user?.githubId ?? "yxxnxyxxn"}</span>
            <span className="input-github-row__status">로그인됨 ✓</span>
          </div>

          <div
            className="input-consent-row"
            role="checkbox"
            aria-checked={agreedToAnalyze}
            tabIndex={0}
            onClick={() => setAgreedToAnalyze((v) => !v)}
            onKeyDown={(e) => e.key === "Enter" && setAgreedToAnalyze((v) => !v)}
          >
            <span className={`input-consent-row__box${agreedToAnalyze ? " input-consent-row__box--checked" : ""}`}>
              {agreedToAnalyze ? "✓" : ""}
            </span>
            <div>
              <p className="input-consent-row__title">
                {hasExistingProjects ? "새로 추가된 레포가 있어요" : "공개 repository 분석에 동의합니다"}
              </p>
              <p className="input-consent-row__desc">
                {hasExistingProjects
                  ? "체크하면 새로 추가된 레포만 찾아서 수집해요. 이미 수집한 프로젝트는 다시 건드리지 않아요."
                  : "수집한 내용은 프로젝트 후보 생성과 이력서 추천에만 사용돼요."}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="input-card-head">
            <span className="input-card-title">채용공고 등록</span>
            <span className="input-step-badge">STEP 2</span>
          </div>
          <p className="input-card-desc">URL, 이미지, 직접 입력 중 편한 방식으로 공고 내용을 등록해 주세요.</p>

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
                회사명 · 직무 · 필수/우대 기술 · 요구 역량을 자동으로 추출해요
              </div>
            </div>
          )}

          {jobState.mode === "image" && (
            <div className="input-field-stack">
              <label className="input-image-upload">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="input-image-upload__input"
                  onChange={(e) => handleImageChange(e.target.files)}
                />
                <span className="input-image-upload__title">
                  {jobState.imageNames.length > 0
                    ? `채용공고 이미지 ${jobState.imageNames.length}장 선택됨`
                    : "채용공고 이미지 선택"}
                </span>
                <span className="input-image-upload__desc">
                  PNG, JPG 등 이미지 속 텍스트를 읽어 공고 정보로 저장해요. 최대 6장까지 선택할 수 있어요.
                </span>
              </label>
              {jobState.imageDataUrls.length > 0 && (
                <div className="input-image-preview-grid">
                  {jobState.imageDataUrls.map((imageDataUrl, index) => (
                    <figure className="input-image-preview-item" key={`${jobState.imageNames[index]}-${index}`}>
                      <img
                        className="input-image-preview"
                        src={imageDataUrl}
                        alt={`업로드한 채용공고 이미지 미리보기 ${index + 1}`}
                      />
                      <figcaption>{jobState.imageNames[index]}</figcaption>
                    </figure>
                  ))}
                </div>
              )}
              <div className="input-hint">
                <span className="input-hint__dot" />
                글자가 선명하고 잘리지 않은 이미지일수록 더 정확해요
              </div>
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

          {errorMessage && <p className="input-error">{errorMessage}</p>}
        </Card>
      </PageContainer>

      <div className="input-fixed-cta">
        <Button
          variant="primary"
          size="lg"
          className="input-fixed-cta__btn"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {submitting
            ? willCollect
              ? "수집하는 중..."
              : "등록하는 중..."
            : willCollect
              ? "프로젝트 수집하고 확인하기 →"
              : "채용공고 등록하고 확인하기 →"}
        </Button>
      </div>
    </>
  );
}
