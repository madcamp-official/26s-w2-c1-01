import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { EditableProject } from "../../types/project";
import { fetchProjects, updateProject as apiUpdateProject } from "../../api/projects";
import type { UpdateProjectPayload } from "../../api/projects";

interface ProjectsContextValue {
  projects: EditableProject[];
  loading: boolean;
  activeCount: number;
  updateProject: (projectId: number, patch: UpdateProjectPayload) => void;
  toggleExcluded: (projectId: number) => void;
  addSkill: (projectId: number, skill: string) => void;
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<EditableProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // api-spec.md #7 GET /projects
    fetchProjects().then((data) => {
      setProjects(data.map((p) => ({ ...p, excluded: false })));
      setLoading(false);
    });
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

  const addSkill = (projectId: number, skill: string) =>
    setProjects((prev) =>
      prev.map((p) => (p.projectId === projectId ? { ...p, skills: [...p.skills, skill] } : p)),
    );

  const activeCount = useMemo(() => projects.filter((p) => !p.excluded).length, [projects]);

  return (
    <ProjectsContext.Provider
      value={{ projects, loading, activeCount, updateProject, toggleExcluded, addSkill }}
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
