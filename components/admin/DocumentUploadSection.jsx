import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export default function DocumentUploadSection({ quoteId, initialFiles = [], onFilesChange, onUploadComplete, canEdit = true }) {
  const [uploadedFiles, setUploadedFiles] = useState(initialFiles);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setUploadedFiles(initialFiles);
  }, [initialFiles]);

  useEffect(() => {
    if (onFilesChange) {
      onFilesChange(uploadedFiles);
    }
  }, [uploadedFiles]);

  async function getPageCount(file) {
    const fileType = file.type;

    if (fileType === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        return pdf.numPages;
      } catch (error) {
        console.error('PDF page count error:', error);
        return null;
      }
    } else if (fileType.startsWith('image/')) {
      return 1;
    } else {
      return null;
    }
  }

  function formatFileSize(bytes) {
    return (bytes / 1024).toFixed(1) + ' KB';
  }

  function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + ' min ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + ' hour' + (hours > 1 ? 's' : '') + ' ago';
    const days = Math.floor(hours / 24);
    return days + ' day' + (days > 1 ? 's' : '') + ' ago';
  }

  function getFileIcon(fileType) {
    if (fileType === 'application/pdf') return '📄';
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    return '📎';
  }

  async function handleFileUpload(files) {
    const fileArray = Array.from(files);
    setIsProcessing(true);

    try {
      const newFiles = [];
      for (const file of fileArray) {
        const pageCount = await getPageCount(file);

        const fileData = {
          id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          filename: file.name,
          file_size: file.size,
          page_count: pageCount,
          document_type: 'translate',
          uploaded_at: new Date(),
          file_type: file.type,
          file_object: file,
          source: 'upload',
        };

        newFiles.push(fileData);
      }

      setUploadedFiles(prev => [...prev, ...newFiles]);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function updateDocumentType(fileId, newType) {
    setUploadedFiles(prev =>
      prev.map(f => (f.id === fileId ? { ...f, document_type: newType } : f))
    );
  }

  function viewFile(fileId) {
    const file = uploadedFiles.find(f => f.id === fileId);
    if (file && file.file_object) {
      const url = URL.createObjectURL(file.file_object);
      window.open(url, '_blank');
    }
  }

  function removeFile(fileId) {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.borderColor = '#3b82f6';
    e.currentTarget.style.backgroundColor = '#eff6ff';
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.borderColor = '#d1d5db';
    e.currentTarget.style.backgroundColor = '#f9fafb';
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.borderColor = '#d1d5db';
    e.currentTarget.style.backgroundColor = '#f9fafb';

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }

  const styles = `
    .document-upload-section {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 24px;
    }

    .document-upload-section h3 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #111827;
    }

    .document-upload-section > p {
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 20px;
    }

    .upload-zone {
      border: 2px dashed #d1d5db;
      border-radius: 8px;
      padding: 40px;
      text-align: center;
      background: #f9fafb;
      margin-bottom: 24px;
      transition: all 0.3s;
      cursor: pointer;
    }

    .upload-zone:hover {
      border-color: #3b82f6;
      background: #eff6ff;
    }

    .upload-zone-label {
      cursor: pointer;
      display: block;
      padding: 0;
      margin: 0;
    }

    .upload-zone-icon {
      font-size: 48px;
      margin-bottom: 10px;
      line-height: 1;
    }

    .upload-zone p {
      color: #6b7280;
      margin: 0;
      font-size: 14px;
    }

    .uploaded-files-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .empty-state {
      text-align: center;
      color: #9ca3af;
      padding: 40px;
      font-size: 14px;
    }

    .file-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: white;
      gap: 16px;
    }

    .file-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .file-icon {
      font-size: 32px;
      line-height: 1;
      flex-shrink: 0;
    }

    .file-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .filename {
      font-weight: 600;
      font-size: 14px;
      color: #111827;
    }

    .file-meta {
      font-size: 12px;
      color: #6b7280;
    }

    .document-type-select {
      width: 200px;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      background: white;
      cursor: pointer;
      flex-shrink: 0;
    }

    .document-type-select:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .file-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }

    .btn-view, .btn-remove {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      white-space: nowrap;
    }

    .btn-view {
      background: #f3f4f6;
      color: #374151;
    }

    .btn-view:hover {
      background: #e5e7eb;
    }

    .btn-remove {
      background: #fee2e2;
      color: #dc2626;
    }

    .btn-remove:hover {
      background: #fecaca;
    }

    @media (max-width: 768px) {
      .file-item {
        flex-direction: column;
        align-items: flex-start;
      }

      .document-type-select {
        width: 100%;
      }

      .file-actions {
        width: 100%;
      }

      .btn-view, .btn-remove {
        flex: 1;
      }
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="document-upload-section">
        <h3>Documents</h3>
        <p>Upload files and specify how each should be processed</p>

        {canEdit && (
          <div
            className="upload-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              id="fileInput"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={e => handleFileUpload(e.target.files)}
              style={{ display: 'none' }}
            />
            <label htmlFor="fileInput" className="upload-zone-label">
              <div className="upload-zone-icon">{isProcessing ? '⏳' : '📎'}</div>
              <p>{isProcessing ? 'Processing files...' : 'Drag & drop files here or click to browse'}</p>
            </label>
          </div>
        )}

        <div className="uploaded-files-list">
          {uploadedFiles.length === 0 ? (
            <p className="empty-state">No documents uploaded yet</p>
          ) : (
            uploadedFiles.map(file => (
              <div key={file.id} className="file-item">
                <div className="file-info">
                  <div className="file-icon">{getFileIcon(file.file_type)}</div>
                  <div className="file-details">
                    <div className="filename">{file.filename}</div>
                    <div className="file-meta">
                      {file.page_count ? file.page_count + ' pages' : '— pages'} • {formatFileSize(file.file_size)} •{' '}
                      Uploaded {formatTimeAgo(file.uploaded_at)}
                    </div>
                  </div>
                </div>

                <select
                  className="document-type-select"
                  value={file.document_type}
                  onChange={e => updateDocumentType(file.id, e.target.value)}
                  disabled={!canEdit}
                >
                  <option value="translate">Translate</option>
                  <option value="reference">Reference</option>
                  <option value="template">Template</option>
                  <option value="certification">Certification Copy</option>
                  <option value="other">Other</option>
                </select>

                <div className="file-actions">
                  <button
                    className="btn-view"
                    onClick={() => viewFile(file.id)}
                    disabled={!file.file_object}
                  >
                    View
                  </button>
                  {canEdit && (
                    <button className="btn-remove" onClick={() => removeFile(file.id)}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
