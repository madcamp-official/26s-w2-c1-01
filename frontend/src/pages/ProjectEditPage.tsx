import { useNavigate } from "react-router-dom";
import { Header, PageContainer } from "../components/Layout";
import { Button } from "../components/Button";
import { ProjectCard } from "../components/ProjectCard";
import { useProjects } from "../features/projects/useProjects";
import "./ProjectEditPage.css";

export function ProjectEditPage() {
  const navigate = useNavigate();
  const { projects, activeCount, updateProject, toggleExcluded, addStack } = useProjects();

  return (
    <>
      <Header />
      <PageContainer maxWidth={760}>
        <h1 className="edit-title">
          프로젝트 <span className="edit-title__accent">{activeCount}개</span>를 찾았어요
        </h1>
        <p className="edit-subtitle">
          내용을 확인하고 수정하거나, 분석에서 제외할 수 있어요.
          <br />
          같은 프로젝트가 나뉘어 있다면 병합해 주세요.
        </p>

        <div className="edit-list">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onTitleChange={(title) => updateProject(project.id, { title })}
              onRoleChange={(role) => updateProject(project.id, { role })}
              onProblemChange={(problem) => updateProject(project.id, { problem })}
              onResultChange={(result) => updateProject(project.id, { result })}
              onAddStack={() => addStack(project.id, "새 스택")}
              onToggleExclude={() => toggleExcluded(project.id)}
            />
          ))}
        </div>
      </PageContainer>

      <div className="edit-fixed-cta">
        <Button
          variant="dark"
          size="lg"
          className="edit-fixed-cta__btn"
          onClick={() => navigate("/progress")}
        >
          프로젝트 {activeCount}개로 분석하기
        </Button>
      </div>
    </>
  );
}
