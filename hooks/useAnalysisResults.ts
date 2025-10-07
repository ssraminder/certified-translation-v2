import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(async r => {
  const ct = r.headers.get('content-type') || '';
  const json = ct.includes('application/json') ? await r.json() : null;
  if (!r.ok) throw new Error(json?.error || `Request failed (${r.status})`);
  return json;
});

function num(v: any){ const n = Number(v); return Number.isFinite(n) ? n : 0; }

export function useAnalysisResults(runId: string | null, shouldFetch: boolean) {
  const key = runId && shouldFetch ? `/api/analysis-runs/${encodeURIComponent(runId)}` : null;
  const { data, error, isLoading, mutate } = useSWR<any>(key, fetcher, { revalidateOnFocus: false });

  const documents = Array.isArray(data?.documents) ? data.documents : [];
  const summary = {
    total_documents: documents.length,
    total_pages: documents.reduce((a: number, b: any) => a + (num(b.pages)||0), 0),
    billable_pages: documents.reduce((a: number, b: any) => a + num(b.billable_pages), 0),
    estimated_total: documents.reduce((a: number, b: any) => a + (num(b.line_total)||0), 0),
  };

  return { data, documents, summary, error, isLoading, mutate };
}
