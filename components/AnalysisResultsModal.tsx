import React, { useEffect, useMemo, useState } from 'react';
import { useAnalysisPolling } from '../hooks/useAnalysisPolling';
import { useAnalysisResults } from '../hooks/useAnalysisResults';

type Props = {
  quoteId?: string | null;
  runId?: string | null;
  open?: boolean;
  onClose?: () => void;
};

export default function AnalysisResultsModal({ quoteId, runId, open = true, onClose }: Props){
  const [retryTick, setRetryTick] = useState(0);
  const { status, error: statusError, isLoading: statusLoading, restartPolling, refreshInterval } = useAnalysisPolling(runId ?? null);
  const shouldFetchResults = status === 'ready' || status === 'completed';
  const { data, documents, summary, error: resultsError, isLoading: resultsLoading } = useAnalysisResults(runId ?? null, Boolean(shouldFetchResults));

  const loading = statusLoading || (shouldFetchResults && resultsLoading);
  const anyError = statusError || resultsError;

  useEffect(() => {
    if (!open) return;
  }, [open]);

  const disabled = loading || !shouldFetchResults;

  if (!open) return null;

  if (!runId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded p-4 max-w-lg w-full">
          <div className="error-message text-red-700">Missing run ID</div>
          <div className="mt-3 text-sm text-gray-600">We can't check the analysis without a run ID.</div>
          <div className="mt-4 text-right">
            <button className="px-3 py-2 rounded bg-gray-200" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  const statusText = useMemo(() => {
    if (status === 'pending' || status === 'processing' || status === null) return 'Processing…';
    if (status === 'ready') return 'Ready';
    if (status === 'completed') return 'Completed';
    if (status === 'error' || anyError) return 'Error';
    return String(status || '');
  }, [status, anyError]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold">Analysis Results</div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="p-4 space-y-3">
          {(anyError || status === 'error') && (
            <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800">
              Error loading status or results.
              <div className="mt-2">
                <button onClick={() => { setRetryTick(t=>t+1); restartPolling(); }} className="px-3 py-1 rounded bg-red-600 text-white">Retry</button>
              </div>
            </div>
          )}

          <div className="rounded border p-3 text-sm text-gray-700">
            {statusText} {refreshInterval ? `(polling every 2s)` : ''}
          </div>

          {(status === 'ready' || status === 'completed') && (
            <div>
              <div className="mb-3 grid grid-cols-4 gap-3 text-sm">
                <div className="rounded border p-3"><div className="text-gray-600">Documents</div><div className="text-lg font-semibold">{summary.total_documents}</div></div>
                <div className="rounded border p-3"><div className="text-gray-600">Total Pages</div><div className="text-lg font-semibold">{summary.total_pages}</div></div>
                <div className="rounded border p-3"><div className="text-gray-600">Billable Pages</div><div className="text-lg font-semibold">{summary.billable_pages}</div></div>
                <div className="rounded border p-3"><div className="text-gray-600">Estimate</div><div className="text-lg font-semibold">${summary.estimated_total.toFixed(2)}</div></div>
              </div>

              {documents.length === 0 ? (
                <div className="text-sm text-gray-600">No documents</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600">
                        <th className="px-2 py-1">Filename</th>
                        <th className="px-2 py-1">Doc Type</th>
                        <th className="px-2 py-1">Pages</th>
                        <th className="px-2 py-1">Billable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((d: any, i: number) => (
                        <tr key={d.filename + i} className="border-t">
                          <td className="px-2 py-1">{d.filename}</td>
                          <td className="px-2 py-1">{d.document_type || '-'}</td>
                          <td className="px-2 py-1">{d.pages ?? '-'}</td>
                          <td className="px-2 py-1">{d.billable_pages ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {(status === 'pending' || status === 'processing' || status === null) && (
            <div className="text-sm text-gray-500">We’re analyzing your documents. This can take a couple of minutes.</div>
          )}

          <div className="flex gap-2">
            <button disabled className="px-3 py-2 rounded bg-gray-200 text-gray-700 disabled:opacity-50">View Details</button>
            <button disabled={disabled} className="px-3 py-2 rounded bg-green-600 text-white disabled:opacity-50">Use Analysis</button>
          </div>
        </div>
      </div>
    </div>
  );
}
