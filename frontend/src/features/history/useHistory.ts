import { useEffect, useState } from "react";
import type { HistoryEntry } from "../../types/history";
import { fetchHistory } from "../../api/history";

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory().then((data) => {
      setHistory(data);
      setLoading(false);
    });
  }, []);

  return { history, loading };
}
