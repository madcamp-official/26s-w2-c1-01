import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { createJobPosting } from "../api/jobPostings";
import { ApiError } from "../api/client";
import type { JobPosting, JobPostingInputType } from "../types/jobPosting";
import "./JobPostingPage.css";

export function JobPostingPage() {
  const { accessToken } = useAuth();
  const [inputType, setInputType] = useState<JobPostingInputType>("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<JobPosting | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accessToken) return;

    const content = inputType === "url" ? url.trim() : text.trim();
    if (!content) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const posting = await createJobPosting(accessToken, inputType, content);
      setResult(posting);
    } catch (err) {
      if (err instanceof ApiError && err.code === "JOB_POSTING_URL_FETCH_FAILED") {
        // URL 인식에 실패하면 텍스트 입력 탭으로 전환해 폴백을 안내합니다.
        setInputType("text");
        setError(err.message);
      } else {
        setError(err instanceof ApiError ? err.message : "채용공고를 등록하지 못했습니다.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setResult(null);
    setUrl("");
    setText("");
    setError(null);
  }

  if (result) {
    return (
      <section className="job-posting-page">
        <div className="job-posting-card">
          <h1>채용공고 등록 완료</h1>
          <p className="job-posting-description">아래 내용을 기반으로 공고 분석을 진행할 수 있습니다.</p>
          <pre className="job-posting-raw-text">{result.rawText}</pre>
          <Link className="job-posting-button" to={`/job-postings/${result.jobPostingId}/analysis`}>
            공고 분석하러 가기
          </Link>
          <button type="button" className="job-posting-button-secondary" onClick={handleReset}>
            다른 공고 등록하기
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="job-posting-page">
      <div className="job-posting-card">
        <h1>채용공고 등록</h1>
        <p className="job-posting-description">
          채용공고 URL을 입력하거나, 공고 원문을 직접 붙여넣어주세요.
        </p>

        <div className="job-posting-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={inputType === "url"}
            className={inputType === "url" ? "active" : ""}
            onClick={() => setInputType("url")}
          >
            URL 입력
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={inputType === "text"}
            className={inputType === "text" ? "active" : ""}
            onClick={() => setInputType("text")}
          >
            텍스트 직접 입력
          </button>
        </div>

        <form className="job-posting-form" onSubmit={handleSubmit}>
          {inputType === "url" ? (
            <input
              type="url"
              placeholder="https://example.com/jobs/backend"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          ) : (
            <textarea
              placeholder="채용공고 원문을 붙여넣어주세요."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              required
            />
          )}
          {error && <p className="job-posting-error">{error}</p>}
          <button type="submit" className="job-posting-button" disabled={isSubmitting}>
            {isSubmitting ? "등록하는 중..." : "채용공고 등록"}
          </button>
        </form>
      </div>
    </section>
  );
}
