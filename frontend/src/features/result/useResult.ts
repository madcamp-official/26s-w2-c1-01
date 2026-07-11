import { useEffect, useState } from "react";
import type { AnalysisResult } from "../../types/result";
import { fetchResult } from "../../api/result";

export function useResult(id: string | undefined) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchResult(id).then((data) => {
      setResult(data);
      setLoading(false);
    });
  }, [id]);

  return { result, loading };
}
