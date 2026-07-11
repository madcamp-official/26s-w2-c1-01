import { Badge, sourceTone } from "./Badge";
import { Chip } from "./Chip";
import type { EditableProject } from "../types/project";
import "./ProjectCard.css";

const sourceLabel: Record<EditableProject["sourceType"], string> = {
  github: "GitHub",
  notion: "Notion",
  pdf: "PDF",
};

function repoPath(sourceUrl: string) {
  try {
    return new URL(sourceUrl).pathname.replace(/^\//, "");
  } catch {
    return sourceUrl;
  }
}

interface ProjectCardProps {
  project: EditableProject;
  onTitleChange: (title: string) => void;
  onRoleChange: (role: string) => void;
  onDescriptionChange: (description: string) => void;
  onAchievementsChange: (achievements: string[]) => void;
  onAddSkill: () => void;
  onToggleExclude: () => void;
}

export function ProjectCard({
  project,
  onTitleChange,
  onRoleChange,
  onDescriptionChange,
  onAchievementsChange,
  onAddSkill,
  onToggleExclude,
}: ProjectCardProps) {
  const label = sourceLabel[project.sourceType];

  return (
    <div className="project-card" style={{ opacity: project.excluded ? 0.45 : 1 }}>
      <div className="project-card__head">
        <div className="project-card__head-main">
          <div className="project-card__badges">
            <Badge tone={sourceTone(label)}>{label}</Badge>
            <span className="project-card__repo">{repoPath(project.sourceUrl)}</span>
            {project.excluded && <Badge tone="excluded">이력서 생성에서 제외됨</Badge>}
          </div>
          <input
            className="project-card__title"
            value={project.title}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </div>
        <button
          className={`project-card__exclude-btn${project.excluded ? " project-card__exclude-btn--active" : ""}`}
          onClick={onToggleExclude}
        >
          {project.excluded ? "복구" : "제외"}
        </button>
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
          {project.skills.map((s) => (
            <Chip key={s}>{s}</Chip>
          ))}
          <span className="chip chip--dashed" onClick={onAddSkill}>
            + 추가
          </span>
        </div>

        <span className="project-card__label">설명</span>
        <textarea
          className="project-card__field project-card__field--textarea"
          rows={2}
          value={project.description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />

        <span className="project-card__label">성과</span>
        <textarea
          className="project-card__field project-card__field--textarea"
          rows={2}
          value={project.achievements.join(", ")}
          onChange={(e) =>
            onAchievementsChange(
              e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
            )
          }
        />
      </div>
    </div>
  );
}
