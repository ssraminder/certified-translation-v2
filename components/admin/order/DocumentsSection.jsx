import { useState, useRef } from 'react';

export default function DocumentsSection({ order, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const sourceDocuments = order.documents?.filter(d => d.type === 'source') || [];
  const deliveryDocuments = order.documents?.filter(d => d.type === 'delivery') || [];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(f => {
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'application/zip'];
      const maxSize = 25 * 1024 * 1024;
      return validTypes.includes(f.type) && f.size <= maxSize;
    });

    if (validFiles.length === 0) {
      alert('No valid files selected. Supported: PDF, DOC, DOCX, JPG, PNG, ZIP (max 25MB)');
      return;
    }

    setUploading(true);
    for (const file of validFiles) {
      await uploadFile(file);
    }
    setUploading(false);
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('orderId', order.id);
    formData.append('type', 'source');

    try {
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(prev => ({ ...prev, [file.name]: percentComplete }));
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status === 200) {
          const resp = await fetch(`/api/orders/${order.id}`);
          const data = await resp.json();
          onUpdate(data.order);
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[file.name];
            return newProgress;
          });
        } else {
          alert('Upload failed');
        }
      });

      xhr.addEventListener('error', () => {
        alert('Upload error');
      });

      xhr.open('POST', `/api/orders/${order.id}/upload`);
      xhr.send(formData);
    } catch (err) {
      alert('Error uploading file: ' + err.message);
    }
  };

  const handleDelete = async (docId) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const resp = await fetch(`/api/orders/${order.id}/documents/${docId}`, {
        method: 'DELETE',
      });
      if (!resp.ok) throw new Error('Failed to delete');
      const data = await resp.json();
      onUpdate(data.order);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Documents & Files</h2>

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-6 cursor-pointer ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-blue-400'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-gray-700 font-medium">Drag files here or click to browse</p>
        <p className="text-sm text-gray-500 mt-1">PDF, DOC, DOCX, JPG, PNG, ZIP • Max 25MB each</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleChange}
          className="hidden"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
        />
      </div>

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="mb-6 space-y-3">
          {Object.entries(uploadProgress).map(([filename, progress]) => (
            <div key={filename} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">📎 {filename}</span>
                <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Source Documents */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Original Documents</h3>
        {sourceDocuments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No documents uploaded yet</p>
        ) : (
          <div className="space-y-2">
            {sourceDocuments.map(doc => (
              <div key={doc.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{doc.filename}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatFileSize(doc.file_size)} • Uploaded {formatDate(doc.created_at)}
                      </p>
                      {doc.analysis_status && (
                        <p className="text-xs text-green-700 mt-1">✓ {doc.analysis_status}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {doc.file_url && (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Download
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delivery Documents */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Translated Documents</h3>
        {deliveryDocuments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Translation in progress...</p>
        ) : (
          <div className="space-y-2">
            {deliveryDocuments.map(doc => (
              <div key={doc.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{doc.filename}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatFileSize(doc.file_size)} • Ready {formatDate(doc.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {doc.file_url && (
                      <>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Preview
                        </a>
                        <a
                          href={doc.file_url}
                          download
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Download
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
