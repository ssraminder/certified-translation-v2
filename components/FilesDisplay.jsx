import { useState } from 'react';
import { getFilePurposeLabel, getFilePurposeColor, formatFileSize, formatDate } from '../lib/filePurposeLabels';

export default function FilesDisplay({
  quoteFiles = [],
  referenceFiles = [],
  context = 'quote',
  isAdmin = false
}) {
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState(null);

  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('[FilesDisplay] Received data:', {
      quoteFiles: quoteFiles?.length,
      referenceFiles: referenceFiles?.length,
      context,
      isAdmin,
      quoteFilesData: quoteFiles,
      referenceFilesData: referenceFiles
    });

    if (quoteFiles?.length > 0) {
      console.log('[FilesDisplay] Quote files details:', quoteFiles.map(f => ({
        id: f.id,
        filename: f.filename,
        hasUrl: !!f.file_url,
        url: f.file_url ? 'present' : 'missing',
        quote_id: f.quote_id,
        order_id: f.order_id
      })));
    }

    if (referenceFiles?.length > 0) {
      console.log('[FilesDisplay] Reference files details:', referenceFiles.map(f => ({
        id: f.id,
        filename: f.filename,
        hasUrl: !!f.file_url,
        url: f.file_url ? 'present' : 'missing',
        quote_id: f.quote_id
      })));
    }
  }

  const getEndpoint = (tableType) => {
    if (context === 'order') {
      return `/api/orders/[orderId]/refresh-signed-url`;
    }
    return `/api/admin/quotes/[quoteId]/refresh-signed-url`;
  };

  const handleDownload = async (file, tableType, parentId) => {
    try {
      setDownloadingId(file.id);
      setError(null);

      let endpoint = '';
      let body = {};

      if (context === 'order') {
        endpoint = `/api/orders/${parentId}/refresh-signed-url`;
        body = { fileId: file.id };
      } else {
        endpoint = `/api/admin/quotes/${parentId}/refresh-signed-url`;
        body = { fileId: file.id, tableType };
      }

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || 'Failed to generate download link');
      }

      const data = await resp.json();

      if (data.success && data.file.file_url) {
        const link = document.createElement('a');
        link.href = data.file.file_url;
        link.download = file.filename || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Download error:', err);
      setError(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const getFileIcon = (contentType, filename) => {
    if (!contentType && !filename) return '📎';
    if (contentType === 'application/pdf' || filename?.endsWith('.pdf')) return '📄';
    if (contentType?.startsWith('image/') || /\.(jpg|jpeg|png|gif)$/i.test(filename)) return '🖼️';
    if (contentType?.includes('word') || contentType?.includes('document') || /\.(doc|docx)$/i.test(filename)) return '📝';
    if (contentType?.includes('sheet') || /\.(xls|xlsx)$/i.test(filename)) return '📊';
    return '📎';
  };

  if (quoteFiles.length === 0 && referenceFiles.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No files uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {quoteFiles.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Uploads</h3>
          <div className="space-y-2">
            {quoteFiles.map(file => (
              <div
                key={file.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-xl flex-shrink-0 mt-0.5">
                      {getFileIcon(file.content_type, file.filename)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 break-words">{file.filename}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-600">
                        {file.bytes && <span>{formatFileSize(file.bytes)}</span>}
                        {file.bytes && file.created_at && <span>•</span>}
                        {file.created_at && <span>Uploaded {formatDate(file.created_at)}</span>}
                      </div>
                      {file.file_purpose && (
                        <div className="mt-2">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getFilePurposeColor(file.file_purpose)}`}>
                            {getFilePurposeLabel(file.file_purpose)}
                          </span>
                        </div>
                      )}
                      {!file.file_url && (
                        <div className="mt-2 text-xs text-amber-600">
                          Click Download to generate a temporary access link
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDownload(file, 'quote', file.quote_id || file.order_id);
                      }}
                      disabled={downloadingId === file.id}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {downloadingId === file.id ? 'Downloading...' : 'Download'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {referenceFiles.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Documents</h3>
          <div className="space-y-2">
            {referenceFiles.map(file => (
              <div
                key={file.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-xl flex-shrink-0 mt-0.5">
                      {getFileIcon(file.content_type, file.filename)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 break-words">{file.filename}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-600">
                        {file.bytes && <span>{formatFileSize(file.bytes)}</span>}
                        {file.bytes && file.created_at && <span>•</span>}
                        {file.created_at && <span>Uploaded {formatDate(file.created_at)}</span>}
                      </div>
                      {file.file_purpose && (
                        <div className="mt-2">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getFilePurposeColor(file.file_purpose)}`}>
                            {getFilePurposeLabel(file.file_purpose)}
                          </span>
                        </div>
                      )}
                      {file.notes && (
                        <p className="mt-2 text-xs text-gray-700 italic">{file.notes}</p>
                      )}
                      {!file.file_url && (
                        <div className="mt-2 text-xs text-amber-600">
                          Click Download to generate a temporary access link
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDownload(file, 'reference', file.quote_id || file.order_id);
                      }}
                      disabled={downloadingId === file.id}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {downloadingId === file.id ? 'Downloading...' : 'Download'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
