import { useEffect, useRef, useState } from "react";
import type { AnalysisStatus } from "../../types/analysis";
import { mockAnalysisSteps } from "../mock/mockData";

export const analysisSteps = mockAnalysisSteps;

interface UseAnalysisOptions {
  autoAdvance?: boolean;
  speed?: number;
  onComplete?: () => void;
}

// TODO: 실제 앱에서는 startAnalysis + subscribeAnalysisProgress(SSE)로 대체
export function useAnalysis({ autoAdvance = true, speed = 1, onComplete }: UseAnalysisOptions = {}) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<AnalysisStatus>("running");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(100, prev + 1.1 * speed);
        if (next >= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setStatus("done");
          if (autoAdvance) {
            setTimeout(() => onComplete?.(), 700);
          }
        }
        return next;
      });
    }, 60);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let currentStep = 0;
  analysisSteps.forEach((step, i) => {
    if (progress >= step.at) currentStep = i;
  });

  return { progress, status, currentStep };
}
