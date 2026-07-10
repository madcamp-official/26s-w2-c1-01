import { useEffect, useRef, useState } from "react";
import { ApiError } from "../api/client";
import type { JobStatus } from "../types/job";

// GitHub 수집 / 공고 분석 / 이력서 생성 작업이 공유하는 폴링 패턴.
// docs/api-spec.md 1. 공통 규칙 - 공통 작업 응답
export function useJobPolling<T extends { status: JobStatus }>(
  poll: (() => Promise<T>) | null,
  intervalMs = 1500,
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef(poll);
  pollRef.current = poll;

  useEffect(() => {
    if (!poll) {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      try {
        const result = await pollRef.current!();
        if (cancelled) return;
        setData(result);
        if (result.status === "pending" || result.status === "running") {
          timer = setTimeout(tick, intervalMs);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "작업 상태를 확인하지 못했습니다.");
      }
    }

    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // poll 함수는 호출부에서 useCallback으로 안정화해 전달합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poll, intervalMs]);

  return { data, error };
}
