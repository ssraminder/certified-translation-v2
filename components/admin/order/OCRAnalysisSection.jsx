import { useState, useEffect } from 'react';

export default function OCRAnalysisSection({ order }) {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    if (!order?.quote_id) {
      setLoading(false);
      return;
    }

    fetchOCRAnalysis();
  }, [order?.quote_id]);

  const fetchOCRAnalysis = async () => {
    try {
      setLoading(true);
      const resp = await fetch(`/api/orders/${order.id}/ocr-analysis`);
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${resp.status}: Failed to fetch OCR analysis`);
      }
      const data = await resp.json();
      setAnalysisData(data);
    } catch (err) {
      console.error('OCR analysis error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleRowExpansion = (rowId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  if (!order?.quote_id) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">OCR Analysis</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">OCR Analysis</h2>
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <p className="text-sm text-red-700 font-medium">Error loading OCR analysis:</p>
          <p className="text-sm text-red-600 mt-1">{error}</p>
          <p className="text-xs text-red-500 mt-2">Check browser console for more details.</p>
        </div>
      </div>
    );
  }

  const hasData = analysisData?.ocr_rows?.length > 0 || analysisData?.quote_sub_orders?.length > 0;

  if (!hasData) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">OCR Analysis</h2>
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-gray-600">No OCR analysis available</p>
        </div>
      </div>
    );
  }

  const mergedData = (analysisData?.ocr_rows || []).map((ocrRow, idx) => {
    const matchingSubOrder = (analysisData?.quote_sub_orders || []).find(
      so => so.filename === ocrRow.filename
    );
    return {
      ...ocrRow,
      ...matchingSubOrder,
      id: `${ocrRow.filename}-${ocrRow.page_number || idx}`,
    };
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">OCR Analysis</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Filename</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Document Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Page</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Word Count</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Billable Pages</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Complexity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Languages</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {mergedData.map((row, idx) => (
              <tr key={row.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900 font-medium break-words max-w-xs">
                  {row.filename || '—'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {row.doc_type || row.document_type || '—'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {row.page_number != null ? row.page_number : '—'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {row.raw_wordcount ? row.raw_wordcount.toLocaleString() : (row.wordcount ? row.wordcount.toLocaleString() : (row.word_count ? row.word_count.toLocaleString() : '—'))}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {row.billable_pages != null ? row.billable_pages : '—'}
                </td>
                <td className="px-6 py-4 text-sm">
                  {(row.complexity_multiplier || row.complexity) ? (
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      (row.complexity_multiplier || row.complexity) > 1.5 ? 'bg-red-100 text-red-800' :
                      (row.complexity_multiplier || row.complexity) > 1.0 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {typeof row.complexity_multiplier === 'number' ? row.complexity_multiplier.toFixed(2) + 'x' : (row.complexity || '—')}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  <div className="flex flex-col gap-1">
                    {row.source_language && <span>Source: {row.source_language}</span>}
                    {row.target_language && <span>Target: {row.target_language}</span>}
                    {!row.source_language && !row.target_language && <span>—</span>}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => toggleRowExpansion(row.id)}
                    className="inline-flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label="Expand details"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${expandedRows.has(row.id) ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {expandedRows.size > 0 && (
        <div className="border-t border-gray-200 bg-gray-50">
          {mergedData.map((row) => (
            expandedRows.has(row.id) && (
              <div key={`${row.id}-details`} className="px-6 py-4 border-b border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  {row.total_pages != null && (
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Total Pages</p>
                      <p className="text-sm text-gray-900">{row.total_pages}</p>
                    </div>
                  )}
                  {row.unit_rate != null && (
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Unit Rate</p>
                      <p className="text-sm text-gray-900">${row.unit_rate.toFixed(2)}</p>
                    </div>
                  )}
                  {row.line_total != null && (
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Line Total</p>
                      <p className="text-sm text-gray-900">${row.line_total.toFixed(2)}</p>
                    </div>
                  )}
                  {row.certification_amount != null && (
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Certification Amount</p>
                      <p className="text-sm text-gray-900">${row.certification_amount.toFixed(2)}</p>
                    </div>
                  )}
                  {row.certification_type_name && (
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Certification Type</p>
                      <p className="text-sm text-gray-900">{row.certification_type_name}</p>
                    </div>
                  )}
                  {row.source && (
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Source</p>
                      <p className="text-sm text-gray-900 capitalize">{row.source}</p>
                    </div>
                  )}
                  {row.detected_language && (
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Detected Language</p>
                      <p className="text-sm text-gray-900">{row.detected_language}</p>
                    </div>
                  )}
                  {row.document_type && (
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Document Type</p>
                      <p className="text-sm text-gray-900">{row.document_type}</p>
                    </div>
                  )}
                  {row.principal_holder_name && (
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Principal Holder</p>
                      <p className="text-sm text-gray-900">{row.principal_holder_name}</p>
                    </div>
                  )}
                  {row.ocr_method && (
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">OCR Method</p>
                      <p className="text-sm text-gray-900">{row.ocr_method}</p>
                    </div>
                  )}
                  {row.is_first_page != null && (
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">First Page</p>
                      <p className="text-sm text-gray-900">{row.is_first_page ? 'Yes' : 'No'}</p>
                    </div>
                  )}
                  {row.page_confidence_score != null && (
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Page Confidence</p>
                      <p className="text-sm text-gray-900">{(row.page_confidence_score * 100).toFixed(1)}%</p>
                    </div>
                  )}
                  {row.text_extraction_confidence != null && (
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Text Extraction</p>
                      <p className="text-sm text-gray-900">{(row.text_extraction_confidence * 100).toFixed(1)}%</p>
                    </div>
                  )}
                  {row.language_detection_confidence != null && (
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Language Detection</p>
                      <p className="text-sm text-gray-900">{(row.language_detection_confidence * 100).toFixed(1)}%</p>
                    </div>
                  )}
                  {row.document_classification_confidence != null && (
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Doc Classification</p>
                      <p className="text-sm text-gray-900">{(row.document_classification_confidence * 100).toFixed(1)}%</p>
                    </div>
                  )}
                  {row.complexity_multiplier != null && (
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Complexity Multiplier</p>
                      <p className="text-sm text-gray-900">{row.complexity_multiplier.toFixed(2)}x</p>
                    </div>
                  )}
                  {row.run_id && (
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Run ID</p>
                      <p className="text-sm text-gray-900 font-mono text-xs">{row.run_id}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
