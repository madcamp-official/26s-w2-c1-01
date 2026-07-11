import { Badge, sourceTone } from "./Badge";
import { Chip } from "./Chip";
import { Button } from "./Button";
import type { Project } from "../types/project";
import "./ProjectCard.css";

interface ProjectCardProps {
  project: Project;
  onTitleChange: (title: string) => void;
  onRoleChange: (role: string) => void;
  onProblemChange: (problem: string) => void;
  onResultChange: (result: string) => void;
  onAddStack: () => void;
  onToggleExclude: () => void;
}

export function ProjectCard({
  project,
  onTitleChange,
  onRoleChange,
  onProblemChange,
  onResultChange,
  onAddStack,
  onToggleExclude,
}: ProjectCardProps) {
  return (
    <div className="project-card" style={{ opacity: project.excluded ? 0.45 : 1 }}>
      <div className="project-card__head">
        <div className="project-card__head-main">
          <div className="project-card__badges">
            <Badge tone={sourceTone(project.source)}>{project.source}</Badge>
            {project.excluded && <Badge tone="excluded">분석에서 제외됨</Badge>}
          </div>
          <input
            className="project-card__title"
            value={project.title}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </div>
        <div className="project-card__actions">
          <Button variant="ghost" size="md" style={{ padding: "9px 14px", fontSize: 13 }}>
            병합
          </Button>
          <button
            className={`project-card__exclude-btn${project.excluded ? " project-card__exclude-btn--active" : ""}`}
            onClick={onToggleExclude}
          >
            {project.excluded ? "복구" : "제외"}
          </button>
        </div>
      </div>

      <div className="project-card__grid">
        <span className="project-card__label">역할</span>
        <input
          className="project-card__field"
          value={project.role}
          onChange={(e) => onRoleChange(e.target.value)}
        />

        <span className="project-card__label">기술 스택</span>
        <div className="project-card__stack">
          {project.stack.map((s) => (
            <Chip key={s}>{s}</Chip>
          ))}
          <span className="chip chip--dashed" onClick={onAddStack}>
            + 추가
          </span>
        </div>

        <span className="project-card__label">문제 해결</span>
        <textarea
          className="project-card__field project-card__field--textarea"
          rows={2}
          value={project.problem}
          onChange={(e) => onProblemChange(e.target.value)}
        />

        <span className="project-card__label">성과</span>
        <textarea
          className="project-card__field project-card__field--textarea"
          rows={2}
          value={project.result}
          onChange={(e) => onResultChange(e.target.value)}
        />
      </div>
    </div>
  );
}
