import { useEffect, useState, useMemo, useRef } from 'react';

export default function ManualLineItemForm({ open, onClose, quoteId, files, onCreated }){
  const [fileId, setFileId] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [billablePages, setBillablePages] = useState('');
  const [unitRate, setUnitRate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(()=> {
    if (!open){
      setFileId('');
      setTotalPages('');
      setBillablePages('');
      setUnitRate('');
      setUploadedFiles([]);
      setUploadError('');
    }
  }, [open]);

  const total = useMemo(() => {
    const pages = Number(billablePages) || 0;
    const rate = Number(unitRate) || 0;
    return (pages * rate).toFixed(2);
  }, [billablePages, unitRate]);

  const allAvailableFiles = [...(files || []), ...uploadedFiles];

  async function handleFileUpload(e) {
    const uploadedFilesList = e.target.files;
    if (!uploadedFilesList || uploadedFilesList.length === 0) return;

    setUploading(true);
    setUploadError('');
    try {
      const form = new FormData();
      for (const file of uploadedFilesList) {
        form.append('files', file);
      }

      const resp = await fetch(`/api/admin/quotes/${quoteId}/files`, {
        method: 'POST',
        body: form
      });

      const json = await resp.json();
      if (!resp.ok) {
        throw new Error(json?.error || 'Upload failed');
      }

      if (json?.success && json.uploaded_files) {
        const newFiles = json.uploaded_files;
        setUploadedFiles(prev => [...prev, ...newFiles]);
        if (newFiles.length === 1) {
          setFileId(newFiles[0].file_id || newFiles[0].id);
        }
      }
    } catch (err) {
      setUploadError(err?.message || 'Failed to upload files');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function submit(e){
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const selectedFile = allAvailableFiles.find(f => (f.file_id || f.id) === fileId);
      const payload = {
        file_id: fileId || null,
        filename: selectedFile?.filename || null,
        billable_pages: Number(billablePages),
        unit_rate: Number(unitRate),
        total_pages: Number(totalPages) || Number(billablePages)
      };
      const resp = await fetch(`/api/admin/quotes/${quoteId}/line-items/manual`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      const json = await resp.json();
      if (json?.success){
        onCreated && onCreated(json.line_item, json.totals);
        onClose && onClose();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const hasFiles = Array.isArray(allAvailableFiles) && allAvailableFiles.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg border bg-white shadow-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Add Manual Line Item</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 opacity-70 hover:opacity-100"
            type="button"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 16 16">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M12 4L4 12M4 4l8 8"/>
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="px-6 py-4">
          <div className="space-y-4">
            {/* Upload File Section */}
            <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4">
              <div className="text-center">
                <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
                <p className="text-sm font-medium text-gray-900">Upload a file</p>
                <p className="text-xs text-gray-600 mt-1">or select from existing files below</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.xlsx,.xls"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="mt-3 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Choose Files'}
                </button>
              </div>
              {uploadError && (
                <div className="mt-3 p-2 rounded bg-red-50 border border-red-200">
                  <p className="text-xs text-red-700">{uploadError}</p>
                </div>
              )}
              {uploadedFiles.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-gray-700">Recently uploaded:</p>
                  {uploadedFiles.map(f => (
                    <div key={f.file_id || f.id} className="text-xs text-gray-600 p-1 bg-white rounded border border-gray-200">
                      ✓ {f.filename}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Select File */}
            <div>
              <label className="block text-sm font-medium mb-2">Select File {hasFiles ? '*' : '(optional)'}</label>
              <div className="relative">
                <select
                  value={fileId}
                  onChange={e=> setFileId(e.target.value)}
                  className="w-full rounded-lg border-0 bg-gray-100 px-3 py-2 text-sm appearance-none pr-8"
                  required={hasFiles}
                  disabled={!hasFiles}
                >
                  <option value="">{hasFiles ? 'Choose a file...' : 'No files available'}</option>
                  {allAvailableFiles.map(f => (
                    <option key={f.file_id||f.id} value={f.file_id||f.id}>{f.filename}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M4 6l4 4 4-4"/>
                </svg>
              </div>
            </div>

            {/* Total Pages */}
            <div>
              <label className="block text-sm font-medium mb-2">Total Pages *</label>
              <input 
                type="number" 
                step="1" 
                min="1" 
                value={totalPages} 
                onChange={e=> setTotalPages(e.target.value)} 
                className="w-full rounded-lg border-0 bg-gray-100 px-3 py-2 text-sm"
                required 
              />
            </div>

            {/* Billable Pages */}
            <div>
              <label className="block text-sm font-medium mb-2">Billable Pages *</label>
              <input 
                type="number" 
                step="0.1" 
                min="0.1" 
                value={billablePages} 
                onChange={e=> setBillablePages(e.target.value)} 
                className="w-full rounded-lg border-0 bg-gray-100 px-3 py-2 text-sm"
                required 
              />
            </div>

            {/* Unit Rate */}
            <div>
              <label className="block text-sm font-medium mb-2">Unit Rate *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">$</span>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0.01" 
                  value={unitRate} 
                  onChange={e=> setUnitRate(e.target.value)} 
                  className="w-full rounded-lg border-0 bg-gray-100 pl-7 pr-3 py-2 text-sm"
                  required 
                />
              </div>
              <p className="mt-1 text-sm text-gray-600">per page</p>
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Total Display */}
            <div className="rounded bg-gray-50 px-3 py-3">
              <p className="font-medium">Total: ${total}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-4 py-2 rounded-lg border text-sm font-medium"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={submitting} 
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
              >
                Add Line Item
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
