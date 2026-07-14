import { useEffect, useMemo, useState } from "react";
import { Header, PageContainer } from "../components/Layout";
import { Button } from "../components/Button";
import { deleteCv, fetchCvs, updateCvSection, uploadCv } from "../api/cvs";
import type { CvDocument, CvSection } from "../types/cv";
import "./CvManagePage.css";

const sectionHints: Record<CvSection["sectionType"], string> = {
  basic_info: "이름, 이메일, 한 줄 소개처럼 이력서의 기본 정보를 정리해 주세요.",
  education: "학교, 전공, 기간, 주요 수업이나 연구 경험을 정리해 주세요.",
  certificates: "자격증, 수상, 어학, 교육 이수 내용을 정리해 주세요.",
  career: "회사, 역할, 기간, 맡은 업무와 성과를 정리해 주세요.",
  activities: "동아리, 대외 활동, 해커톤, 봉사, 운영 경험을 정리해 주세요.",
  projects: "프로젝트명, 사용 기술, 역할, 문제 해결 과정과 결과를 정리해 주세요.",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function CvManagePage() {
  const [cvs, setCvs] = useState<CvDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingSectionId, setSavingSectionId] = useState<number | null>(null);
  const [selectedCvId, setSelectedCvId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedCv = useMemo(
    () => cvs.find((cv) => cv.cvId === selectedCvId) ?? cvs[0],
    [cvs, selectedCvId],
  );

  const refresh = async () => {
    setLoading(true);
    try {
      setCvs(await fetchCvs());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setMessage("PDF 파일만 업로드할 수 있습니다.");
      return;
    }

    setUploading(true);
    setMessage(null);
    try {
      const cv = await uploadCv(file);
      setCvs((prev) => [cv, ...prev]);
      setSelectedCvId(cv.cvId);
      setMessage("CV가 업로드되었습니다. 추출된 내용을 확인하고 필요한 부분을 다듬어 주세요.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "CV 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const handleSectionChange = (cvId: number, sectionId: number, field: "title" | "content", value: string) => {
    setCvs((prev) =>
      prev.map((cv) =>
        cv.cvId !== cvId
          ? cv
          : {
              ...cv,
              sections: cv.sections.map((section) =>
                section.sectionId === sectionId ? { ...section, [field]: value } : section,
              ),
            },
      ),
    );
  };

  const handleSaveSection = async (cvId: number, section: CvSection) => {
    setSavingSectionId(section.sectionId);
    setMessage(null);
    try {
      const saved = await updateCvSection(section.sectionId, {
        title: section.title,
        content: section.content,
      });
      setCvs((prev) =>
        prev.map((cv) =>
          cv.cvId !== cvId
            ? cv
            : {
                ...cv,
                sections: cv.sections.map((item) => (item.sectionId === saved.sectionId ? saved : item)),
              },
        ),
      );
      setMessage("저장되었습니다. CV 기반 프로젝트 후보도 함께 갱신되었습니다.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "섹션 저장에 실패했습니다.");
    } finally {
      setSavingSectionId(null);
    }
  };

  const handleDelete = async (cvId: number) => {
    setMessage(null);
    try {
      await deleteCv(cvId);
      setCvs((prev) => prev.filter((cv) => cv.cvId !== cvId));
      setSelectedCvId((prev) => (prev === cvId ? null : prev));
      setMessage("CV가 삭제되었습니다.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "CV 삭제에 실패했습니다.");
    }
  };

  return (
    <>
      <Header />
      <PageContainer maxWidth={860}>
        <div className="cv-page-head">
          <div>
            <h1 className="cv-title">내 CV 관리</h1>
            <p className="cv-subtitle">
              PDF CV를 올리면 기본 정보, 학력, 자격증, 경력, 활동, 프로젝트 경험으로 나누어 분석에 반영합니다.
            </p>
          </div>
          <label className="cv-upload-button">
            <input
              type="file"
              accept="application/pdf"
              className="cv-upload-button__input"
              onChange={(e) => handleUpload(e.target.files)}
              disabled={uploading}
            />
            {uploading ? "업로드 중..." : "PDF 추가"}
          </label>
        </div>

        {message && <p className="cv-message">{message}</p>}

        {loading ? (
          <p className="cv-empty">CV를 불러오는 중입니다...</p>
        ) : cvs.length === 0 ? (
          <div className="cv-empty">
            <p className="cv-empty__title">아직 등록된 CV가 없습니다.</p>
            <p>PDF를 추가하면 CV 안의 경험이 프로젝트 추천과 이력서 초안 생성에 함께 사용됩니다.</p>
          </div>
        ) : (
          <div className="cv-layout">
            <aside className="cv-list">
              {cvs.map((cv) => (
                <button
                  key={cv.cvId}
                  className={`cv-list-item${selectedCv?.cvId === cv.cvId ? " cv-list-item--active" : ""}`}
                  type="button"
                  onClick={() => setSelectedCvId(cv.cvId)}
                >
                  <span className="cv-list-item__name">{cv.fileName}</span>
                  <span className="cv-list-item__meta">{formatDate(cv.createdAt)}</span>
                </button>
              ))}
            </aside>

            {selectedCv && (
              <section className="cv-document">
                <div className="cv-document-head">
                  <div>
                    <p className="cv-document-head__label">최근 CV</p>
                    <h2 className="cv-document-head__title">{selectedCv.fileName}</h2>
                  </div>
                  <Button
                    variant="ghost"
                    style={{ padding: "10px 14px", fontSize: 13 }}
                    onClick={() => handleDelete(selectedCv.cvId)}
                  >
                    삭제
                  </Button>
                </div>

                <div className="cv-section-list">
                  {selectedCv.sections.map((section) => (
                    <article className="cv-section-card" key={section.sectionId}>
                      <div className="cv-section-card__head">
                        <input
                          className="cv-section-card__title"
                          value={section.title}
                          onChange={(e) =>
                            handleSectionChange(selectedCv.cvId, section.sectionId, "title", e.target.value)
                          }
                        />
                        <Button
                          variant="outline"
                          size="md"
                          style={{ padding: "9px 13px", fontSize: 13 }}
                          disabled={savingSectionId === section.sectionId}
                          onClick={() => handleSaveSection(selectedCv.cvId, section)}
                        >
                          {savingSectionId === section.sectionId ? "저장 중..." : "저장"}
                        </Button>
                      </div>
                      <p className="cv-section-card__hint">{sectionHints[section.sectionType]}</p>
                      <textarea
                        className="cv-section-card__textarea"
                        rows={section.sectionType === "projects" || section.sectionType === "career" ? 7 : 4}
                        value={section.content}
                        onChange={(e) =>
                          handleSectionChange(selectedCv.cvId, section.sectionId, "content", e.target.value)
                        }
                      />
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </PageContainer>
    </>
  );
}
