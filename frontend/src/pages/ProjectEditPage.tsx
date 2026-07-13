import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Header, PageContainer } from "../components/Layout";
import { Button } from "../components/Button";
import { ProjectCard } from "../components/ProjectCard";
import { useProjects } from "../features/projects/useProjects";
import { ApiError } from "../api/client";
import "./ProjectEditPage.css";

interface LocationState {
  jobPostingId?: number;
}

export function ProjectEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { jobPostingId } = (location.state as LocationState | null) ?? {};
  const {
    projects,
    loading,
    errorMessage,
    activeCount,
    refreshProjects,
    updateProject,
    toggleExcluded,
    addSkill,
    addRepository,
  } = useProjects();

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const [repoInput, setRepoInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const handleAddRepository = async () => {
    const fullName = repoInput.trim();
    if (!fullName) return;

    setAdding(true);
    setAddError(null);
    try {
      await addRepository(fullName);
      setRepoInput("");
    } catch (err) {
      setAddError(
        err instanceof ApiError ? err.message : "저장소를 추가하지 못했어요. 다시 시도해주세요.",
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <Header />
      <PageContainer maxWidth={760}>
        <h1 className="edit-title">
          GitHub에서 프로젝트 <span className="edit-title__accent">{activeCount}개</span>를 찾았어요
        </h1>
        <p className="edit-subtitle">내용을 확인하고 수정하거나, 이력서 생성에서 제외할 수 있어요.</p>

        <div className="edit-manual-add">
          <input
            className="edit-manual-add__input"
            type="text"
            placeholder="organization/repo 형식으로 자동 수집되지 않은 저장소를 추가하세요"
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddRepository();
            }}
            disabled={adding}
          />
          <Button
            variant="outline"
            size="md"
            onClick={handleAddRepository}
            disabled={adding || !repoInput.trim()}
          >
            {adding ? "추가하는 중..." : "레포 추가"}
          </Button>
        </div>
        {addError && <p className="edit-manual-add__error">{addError}</p>}

        {loading ? (
          <p className="edit-loading">프로젝트를 불러오는 중이에요...</p>
        ) : errorMessage ? (
          <p className="edit-empty">{errorMessage}</p>
        ) : projects.length === 0 ? (
          <div className="edit-empty">
            <p className="edit-empty__title">수집된 GitHub 프로젝트가 없어요.</p>
            <p className="edit-empty__desc">
              연결된 GitHub 계정에서 접근 가능한 repository가 없거나, OAuth 권한으로 repository 목록을 가져오지 못한 상태입니다.
            </p>
            <Button variant="outline" onClick={() => navigate("/analyze")}>
              다시 수집하기
            </Button>
          </div>
        ) : (
          <div className="edit-list">
            {projects.map((project) => (
              <ProjectCard
                key={project.projectId}
                project={project}
                onTitleChange={(title) => updateProject(project.projectId, { title })}
                onRoleChange={(role) => updateProject(project.projectId, { role })}
                onDescriptionChange={(description) => updateProject(project.projectId, { description })}
                onAchievementsChange={(achievements) => updateProject(project.projectId, { achievements })}
                onAddSkill={() => addSkill(project.projectId, "새 스택")}
                onToggleExclude={() => toggleExcluded(project.projectId)}
              />
            ))}
          </div>
        )}
      </PageContainer>

      <div className="edit-fixed-cta">
        <Button
          variant="dark"
          size="lg"
          className="edit-fixed-cta__btn"
          disabled={activeCount === 0}
          onClick={() => navigate("/progress", { state: { jobPostingId } })}
        >
          프로젝트 {activeCount}개로 분석하기
        </Button>
      </div>
    </>
  );
}
