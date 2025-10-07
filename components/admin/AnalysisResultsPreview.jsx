import { useMemo } from 'react';

export default function AnalysisResultsPreview({ results, onUse, onEdit, onDiscard }){
  const summary = useMemo(() => {
    const lineItems = Number(results?.lineItems ?? 0);
    const totalPages = Number(results?.totalPages ?? 0);
    const estimatedCost = Number(results?.estimatedCost ?? 0);
    return { lineItems, totalPages, estimatedCost };
  }, [results]);

  return (
    <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded">
      <h4 className="text-green-800 font-semibold mb-2">✅ Analysis Complete</h4>
      <div className="bg-white rounded p-3 mb-3">
        <p className="text-sm text-gray-700"><strong>Found:</strong> {summary.lineItems} document(s)</p>
        <p className="text-sm text-gray-700"><strong>Total Pages:</strong> {summary.totalPages}</p>
        <p className="text-sm text-gray-700"><strong>Estimated Cost:</strong> ${summary.estimatedCost.toFixed(2)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={onUse} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">✓ Use Results</button>
        <button onClick={onEdit} className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">✎ Edit Results</button>
        <button onClick={onDiscard} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">✗ Discard Results</button>
      </div>
    </div>
  );
}
