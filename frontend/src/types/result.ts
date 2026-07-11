export interface SkillMatch {
  name: string;
  pct: number;
  weak?: boolean;
}

export interface RankedProject {
  rank: number;
  title: string;
  fitPct: number;
  description: string;
}

export interface ResumeSentence {
  id: string;
  text: string;
  srcRef: string;
  srcQuote: string;
}

export interface GapProject {
  target: string;
  title: string;
  features: string;
  duration: string;
  deliverables: string;
}

export interface AnalysisResult {
  jobTitle: string;
  matchScore: number;
  skills: SkillMatch[];
  rankedProjects: RankedProject[];
  sentences: ResumeSentence[];
  gaps: GapProject[];
}
