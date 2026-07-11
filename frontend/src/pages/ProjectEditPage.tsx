import { useLocation, useNavigate } from "react-router-dom";
import { Header, PageContainer } from "../components/Layout";
import { Button } from "../components/Button";
import { ProjectCard } from "../components/ProjectCard";
import { useProjects } from "../features/projects/useProjects";
import "./ProjectEditPage.css";

interface LocationState {
  jobPostingId?: number;
}

export function ProjectEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { jobPostingId } = (location.state as LocationState | null) ?? {};
  const { projects, loading, activeCount, updateProject, toggleExcluded, addSkill } = useProjects();

  return (
    <>
      <Header />
      <PageContainer maxWidth={760}>
        <h1 className="edit-title">
          GitHub에서 프로젝트 <span className="edit-title__accent">{activeCount}개</span>를 찾았어요
        </h1>
        <p className="edit-subtitle">내용을 확인하고 수정하거나, 이력서 생성에서 제외할 수 있어요.</p>

        {loading ? (
          <p className="edit-loading">프로젝트를 불러오는 중이에요...</p>
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
