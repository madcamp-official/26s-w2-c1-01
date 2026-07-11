import type { ReactNode } from "react";
import "./Badge.css";

type BadgeTone = "step" | "source-github" | "source-notion" | "source-pdf" | "excluded" | "match-high" | "match-low" | "gap";

interface BadgeProps {
  children: ReactNode;
  tone: BadgeTone;
}

export function Badge({ children, tone }: BadgeProps) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function sourceTone(source: string): BadgeTone {
  if (source === "GitHub") return "source-github";
  if (source === "Notion") return "source-notion";
  return "source-pdf";
}
