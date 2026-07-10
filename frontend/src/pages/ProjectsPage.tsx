import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { fetchProjects, updateProject } from "../api/projects";
import { ApiError } from "../api/client";
import type { Project, ProjectUpdateInput } from "../types/project";
import "./ProjectsPage.css";

export function ProjectsPage() {
  const { accessToken } = useAuth();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetchProjects(accessToken);
      setProjects(res.projects);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "프로젝트를 불러오지 못했습니다.");
    }
  }, [accessToken]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  function handleUpdated(updated: Project) {
    setProjects((prev) => prev?.map((p) => (p.projectId === updated.projectId ? updated : p)) ?? prev);
  }

  if (error) {
    return (
      <section className="projects-page">
        <p className="projects-error">{error}</p>
      </section>
    );
  }

  if (!projects) {
    return (
      <section className="projects-page">
        <p>프로젝트를 불러오는 중...</p>
      </section>
    );
  }

  if (projects.length === 0) {
    return (
      <section className="projects-page">
        <p>수집된 프로젝트가 없습니다.</p>
        <Link className="projects-collect-link" to="/collect">
          GitHub 프로젝트 수집하러 가기
        </Link>
      </section>
    );
  }

  return (
    <section className="projects-page">
      <h1>내 프로젝트</h1>
      <div className="project-list">
        {projects.map((project) => (
          <ProjectCard
            key={project.projectId}
            project={project}
            accessToken={accessToken!}
            onUpdated={handleUpdated}
          />
        ))}
      </div>
    </section>
  );
}

function ProjectCard({
  project,
  accessToken,
  onUpdated,
}: {
  project: Project;
  accessToken: string;
  onUpdated: (project: Project) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<ProjectUpdateInput>(toFormValue(project));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) setForm(toFormValue(project));
  }, [project, isEditing]);

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await updateProject(accessToken, project.projectId, form);
      onUpdated({ ...project, ...updated });
      setIsEditing(false);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "저장하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setForm(toFormValue(project));
    setSaveError(null);
    setIsEditing(false);
  }

  if (!isEditing) {
    return (
      <article className="project-card">
        <header className="project-card-header">
          <h2>{project.title}</h2>
          <button type="button" onClick={() => setIsEditing(true)}>
            수정
          </button>
        </header>
        <p className="project-role">{project.role}</p>
        <p>{project.description}</p>
        {project.skills.length > 0 && (
          <ul className="project-tags">
            {project.skills.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        )}
        {project.achievements.length > 0 && (
          <ul className="project-achievements">
            {project.achievements.map((achievement) => (
              <li key={achievement}>{achievement}</li>
            ))}
          </ul>
        )}
        <a className="project-source" href={project.sourceUrl} target="_blank" rel="noreferrer">
          출처 보기 ({project.sourceType})
        </a>
      </article>
    );
  }

  return (
    <article className="project-card project-card-editing">
      <label>
        제목
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </label>
      <label>
        역할
        <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
      </label>
      <label>
        설명
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
        />
      </label>
      <label>
        기술 (쉼표로 구분)
        <input
          value={form.skills.join(", ")}
          onChange={(e) => setForm({ ...form, skills: splitByComma(e.target.value) })}
        />
      </label>
      <label>
        성과 (줄바꿈으로 구분)
        <textarea
          value={form.achievements.join("\n")}
          onChange={(e) => setForm({ ...form, achievements: splitByLine(e.target.value) })}
          rows={3}
        />
      </label>
      {saveError && <p className="projects-error">{saveError}</p>}
      <div className="project-card-actions">
        <button type="button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "저장하는 중..." : "저장"}
        </button>
        <button type="button" onClick={handleCancel} disabled={isSaving}>
          취소
        </button>
      </div>
    </article>
  );
}

function toFormValue(project: Project): ProjectUpdateInput {
  return {
    title: project.title,
    description: project.description,
    role: project.role,
    skills: project.skills,
    achievements: project.achievements,
  };
}

function splitByComma(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitByLine(value: string): string[] {
  return value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}
