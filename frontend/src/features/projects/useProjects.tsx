import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Project } from "../../types/project";
import { mockProjects } from "../mock/mockData";

interface ProjectsContextValue {
  projects: Project[];
  activeCount: number;
  setProjects: (projects: Project[]) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  toggleExcluded: (id: string) => void;
  addStack: (id: string, stack: string) => void;
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(mockProjects);

  const updateProject = (id: string, patch: Partial<Project>) =>
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const toggleExcluded = (id: string) =>
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, excluded: !p.excluded } : p)),
    );

  const addStack = (id: string, stack: string) =>
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stack: [...p.stack, stack] } : p)),
    );

  const activeCount = useMemo(() => projects.filter((p) => !p.excluded).length, [projects]);

  return (
    <ProjectsContext.Provider
      value={{ projects, activeCount, setProjects, updateProject, toggleExcluded, addStack }}
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
