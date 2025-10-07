import React from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

type Props = {
  quoteId: string;
  activeRunId?: string | null;
  onViewRun?: (runId: string) => void;
};

export default function AnalysisHistorySection({ quoteId, activeRunId, onViewRun }: Props){
  const { data, error, isLoading } = useSWR(quoteId ? `/api/analysis-runs/history?quote_id=${encodeURIComponent(quoteId)}&limit=10` : null, fetcher, { revalidateOnFocus: false });
  const runs = Array.isArray(data?.runs) ? data.runs : [];

  if (!quoteId) return null;

  if (isLoading) return <div className="text-sm text-gray-600">Loading history…</div>;
  if (error) return <div className="text-sm text-red-700">Failed to load history</div>;
  if (runs.length === 0) return <div className="text-sm text-gray-500">No previous runs</div>;

  return (
    <div className="space-y-2">
      {runs.map((h: any) => {
        const isActive = h.id === activeRunId;
        return (
          <div key={h.id} className={`flex items-center justify-between text-sm rounded border p-2 ${isActive ? 'bg-blue-50 border-blue-200' : ''}`}>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs ${h.status==='ready'?'bg-green-100 text-green-800':h.discarded?'bg-gray-100 text-gray-600':'bg-yellow-100 text-yellow-800'}`}>{h.status}</span>
              <span>Run v{h.version}</span>
              <span className="text-gray-500">{new Date(h.created_at).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-2 py-1 rounded border" onClick={()=> onViewRun && onViewRun(h.id)}>View</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
