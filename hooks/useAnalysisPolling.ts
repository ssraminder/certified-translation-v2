export type AnalysisStatus = 'pending' | 'processing' | 'ready' | 'completed' | 'error' | 'discarded' | null;

export function useAnalysisPolling(runId: string | null) {
  return { status: null, error: null, isLoading: false, restartPolling: () => {}, stopPolling: () => {}, refreshInterval: 0, mutate: async () => {} };
}
