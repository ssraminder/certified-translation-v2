import { useState } from 'react';

export default function AnalysisResultsSection({ data }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedFile, setExpandedFile] = useState(null);

  if (!data) return null;

  const analysisData = typeof data === 'string' ? JSON.parse(data) : data;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Document Analysis</h2>
          {analysisData.analyzed_at && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              Analyzed on {new Date(analysisData.analyzed_at).toLocaleDateString()}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-200 p-6 space-y-6 bg-blue-50">
          {/* Analysis Summary Card */}
          <div className="bg-white rounded-lg p-6 border border-blue-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Analysis Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Pages</p>
                <p className="text-lg font-bold text-gray-900">{analysisData.total_pages || 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Words</p>
                <p className="text-lg font-bold text-gray-900">{(analysisData.total_words || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Est. Time</p>
                <p className="text-lg font-bold text-gray-900">{analysisData.estimated_time || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Complexity</p>
                <span className="inline-block text-xs font-semibold px-2 py-1 bg-orange-100 text-orange-800 rounded">
                  {analysisData.complexity || 'Medium'}
                </span>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-600 mb-1">Recommended Rate</p>
              <p className="text-2xl font-bold text-gray-900 mb-3">${analysisData.recommended_rate || 0}</p>
              {analysisData.suggested_translator && (
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Assign {analysisData.suggested_translator}
                </button>
              )}
            </div>
          </div>

          {/* File-wise Breakdown */}
          {analysisData.files && analysisData.files.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">File-wise Breakdown</h3>
              <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">File Name</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Pages</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Words</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Language</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Complexity</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisData.files.map((file, idx) => (
                      <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <button className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                            📄 {file.name}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">{file.pages || 0}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{(file.words || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-600">{file.language || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            file.complexity === 'High' ? 'bg-red-100 text-red-800' :
                            file.complexity === 'Medium' ? 'bg-orange-100 text-orange-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {file.complexity || 'Medium'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setExpandedFile(expandedFile === idx ? null : idx)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            {expandedFile === idx ? 'Hide' : 'View'} Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Expanded Page-wise Details */}
                {expandedFile !== null && analysisData.files[expandedFile]?.pages_data && (
                  <div className="bg-gray-50 p-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Page-wise Details</h4>
                    <table className="w-full text-xs">
                      <thead className="bg-white border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Page</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700">Words</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700">Chars</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Special Elements</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700">Complexity</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisData.files[expandedFile].pages_data.map((page, pidx) => (
                          <tr key={pidx} className="border-b border-gray-200 bg-white">
                            <td className="px-3 py-2 text-gray-700">Page {page.number || pidx + 1}</td>
                            <td className="px-3 py-2 text-center text-gray-600">{page.words || 0}</td>
                            <td className="px-3 py-2 text-center text-gray-600">{page.chars || 0}</td>
                            <td className="px-3 py-2 text-gray-600">{page.special_elements || '—'}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                                page.complexity === 'High' ? 'bg-red-100 text-red-800' :
                                page.complexity === 'Medium' ? 'bg-orange-100 text-orange-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {page.complexity || 'Low'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-600">{page.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
