import { useEffect, useState } from "react";
import type { RecommendedProject } from "../../types/analysis";
import type { ParsedJobPosting } from "../../types/jobPosting";
import type { ResumeResult } from "../../types/resume";
import { getAnalysisJob } from "../../api/analysis";
import { startResumeJob, getResumeJob, getResumeResult } from "../../api/resume";

export interface AnalysisData {
  jobPosting: ParsedJobPosting;
  recommendedProjects: RecommendedProject[];
}

export function useRecommendationResult(jobId: number | undefined) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [resume, setResume] = useState<ResumeResult | null>(null);
  const [resumeLoading, setResumeLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;

    async function pollResumeJob(resumeJobId: number): Promise<void> {
      // api-spec.md #13 GET /resume-jobs/{jobId}
      const job = await getResumeJob(resumeJobId);
      if (cancelled) return;

      if (job.status === "failed") {
        setResumeLoading(false);
        return;
      }
      if (job.status === "completed" && job.resultId != null) {
        // api-spec.md #14 GET /resume-results/{resumeResultId}
        const draft = await getResumeResult(job.resultId);
        if (cancelled) return;
        setResume(draft);
        setResumeLoading(false);
        return;
      }
      setTimeout(() => pollResumeJob(resumeJobId), 1200);
    }

    async function load() {
      // api-spec.md #11 GET /analysis-jobs/{jobId}
      const result = await getAnalysisJob(jobId!);
      if (cancelled || !result.jobPosting || !result.recommendedProjects) return;
      const { jobPosting, recommendedProjects } = result;
      setAnalysis({ jobPosting, recommendedProjects });
      setAnalysisLoading(false);

      // api-spec.md #12 POST /resume-jobs
      const resumeJob = await startResumeJob({
        jobPostingId: jobPosting.jobPostingId,
        projectIds: recommendedProjects.map((p) => p.projectId),
      });
      if (cancelled) return;
      pollResumeJob(resumeJob.jobId);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  return { analysis, analysisLoading, resume, resumeLoading };
}
