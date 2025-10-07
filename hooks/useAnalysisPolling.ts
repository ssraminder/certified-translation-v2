import useSWR from 'swr';
import { useCallback, useMemo, useRef } from 'react';

const fetcher = (url: string) => fetch(url).then(async r => {
  const ct = r.headers.get('content-type') || '';
  const json = ct.includes('application/json') ? await r.json() : null;
  if (!r.ok) throw new Error(json?.error || `Request failed (${r.status})`);
  return json;
});

export type AnalysisStatus = 'pending' | 'processing' | 'ready' | 'completed' | 'error' | 'discarded' | null;

export function useAnalysisPolling(runId: string | null) {
  const key = runId ? `/api/analysis-runs/${encodeURIComponent(runId)}/status` : null;

  const shouldPollRef = useRef(true);

  const { data, error, isLoading, mutate } = useSWR<{ status: AnalysisStatus }>(key, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: (latest) => {
      const s: AnalysisStatus = latest?.status ?? null;
      const active = shouldPollRef.current && (s === 'pending' || s === 'processing' || s === null);
      return active ? 2000 : 0;
    },
  });

  const status: AnalysisStatus = data?.status ?? null;

  const stopPolling = useCallback(() => { shouldPollRef.current = false; mutate(); }, [mutate]);
  const restartPolling = useCallback(() => { shouldPollRef.current = true; mutate(); }, [mutate]);

  const refreshInterval = useMemo(() => {
    const active = shouldPollRef.current && (status === 'pending' || status === 'processing' || status === null);
    return active ? 2000 : 0;
  }, [status]);

  return { status, error, isLoading, restartPolling, stopPolling, refreshInterval, mutate };
}
