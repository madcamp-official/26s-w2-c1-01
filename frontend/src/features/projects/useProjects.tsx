import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { EditableProject } from "../../types/project";
import { fetchProjects, updateProject as apiUpdateProject } from "../../api/projects";
import type { UpdateProjectPayload } from "../../api/projects";
import { getAccessToken } from "../../api/client";
import { addGithubRepository } from "../../api/github";

interface ProjectsContextValue {
  projects: EditableProject[];
  loading: boolean;
  errorMessage: string | null;
  activeCount: number;
  refreshProjects: () => Promise<void>;
  updateProject: (projectId: number, patch: UpdateProjectPayload) => void;
  toggleExcluded: (projectId: number) => void;
  addSkill: (projectId: number, skill: string) => void;
  removeSkill: (projectId: number, skill: string) => void;
  addRepository: (fullName: string) => Promise<void>;
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<EditableProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshProjects = useCallback(async () => {
    if (!getAccessToken()) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    // api-spec.md #7 GET /projects
    try {
      const data = await fetchProjects();
      setProjects(data.map((p) => ({ ...p, excluded: false })));
    } catch (err) {
      setProjects([]);
      setErrorMessage(err instanceof Error ? err.message : "프로젝트를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProjects();
  }, []);

  const updateProject = (projectId: number, patch: UpdateProjectPayload) => {
    setProjects((prev) => prev.map((p) => (p.projectId === projectId ? { ...p, ...patch } : p)));
    // api-spec.md #8 PATCH /projects/{projectId}
    apiUpdateProject(projectId, patch);
  };

  const toggleExcluded = (projectId: number) =>
    setProjects((prev) =>
      prev.map((p) => (p.projectId === projectId ? { ...p, excluded: !p.excluded } : p)),
    );

  const addSkill = (projectId: number, skill: string) => {
    const trimmedSkill = skill.trim();
    if (!trimmedSkill) return;

    setProjects((prev) => {
      const project = prev.find((p) => p.projectId === projectId);
      if (!project) return prev;

      const alreadyExists = project.skills.some(
        (existingSkill) => existingSkill.trim().toLowerCase() === trimmedSkill.toLowerCase(),
      );
      if (alreadyExists) return prev;

      const skills = [...project.skills, trimmedSkill];
      apiUpdateProject(projectId, { skills }).catch(() => refreshProjects());
      return prev.map((p) => (p.projectId === projectId ? { ...p, skills } : p));
    });
  };

  const removeSkill = (projectId: number, skill: string) => {
    setProjects((prev) => {
      const project = prev.find((p) => p.projectId === projectId);
      if (!project) return prev;

      const skills = project.skills.filter((existingSkill) => existingSkill !== skill);
      apiUpdateProject(projectId, { skills }).catch(() => refreshProjects());
      return prev.map((p) => (p.projectId === projectId ? { ...p, skills } : p));
    });
  };

  const addRepository = async (fullName: string) => {
    // api-spec.md #9 POST /github/repositories
    const project = await addGithubRepository(fullName);
    setProjects((prev) => {
      const exists = prev.some((p) => p.projectId === project.projectId);
      if (exists) {
        return prev.map((p) => (p.projectId === project.projectId ? { ...p, ...project } : p));
      }
      return [...prev, { ...project, excluded: false }];
    });
  };

  const activeCount = useMemo(() => projects.filter((p) => !p.excluded).length, [projects]);

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        loading,
        errorMessage,
        activeCount,
        refreshProjects,
        updateProject,
        toggleExcluded,
        addSkill,
        removeSkill,
        addRepository,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjects must be used within ProjectsProvider");
  return ctx;
}
