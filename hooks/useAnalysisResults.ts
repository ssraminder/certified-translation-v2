export function useAnalysisResults(runId: string | null, shouldFetch: boolean) {
  return { data: null, documents: [], summary: { total_documents: 0, total_pages: 0, billable_pages: 0, estimated_total: 0 }, error: null, isLoading: false, mutate: async () => {} };
}
