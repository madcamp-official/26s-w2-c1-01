export interface SkillMatch {
  name: string;
  pct: number;
  weak: boolean;
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

export interface SkillGap {
  target: string;
  title: string;
  features: string;
  duration: string;
  deliverables: string;
}

export interface AnalysisResult {
  id: string;
  jobTitle: string;
  matchScore: number;
  skills: SkillMatch[];
  rankedProjects: RankedProject[];
  sentences: ResumeSentence[];
  gaps: SkillGap[];
}
