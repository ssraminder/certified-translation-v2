import { useEffect, useMemo, useRef, useState } from 'react';

import { supabase } from '../../lib/supabaseClient';
import AnalysisModal from './AnalysisModal';

async function parseJsonSafe(resp){
  const ct = resp.headers.get('content-type') || '';
  if (ct.includes('application/json')){
    try { return await resp.json(); } catch { return null; }
  }
  try { const text = await resp.text(); return { error: text }; } catch { return null; }
}

export default function FileManager({ quoteId, initialFiles, canEdit = true, onChange }){
  const [files, setFiles] = useState(initialFiles || []);
  const [selected, setSelected] = useState([]);
  const [batchMode, setBatchMode] = useState('single');
  const [loading, setLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [showEditFeedback, setShowEditFeedback] = useState(false);
  const [showDiscardFeedback, setShowDiscardFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const inputRef = useRef(null);

  useEffect(()=>{ setFiles(initialFiles || []); }, [initialFiles]);

  function toggle(id){ setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id]); }

  async function updatePurpose(id, purpose){
    if (!canEdit) return;
    const resp = await fetch(`/api/admin/quotes/${quoteId}/files/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ file_purpose: purpose }) });
    const json = await parseJsonSafe(resp);
    if (!resp.ok) { throw new Error(json?.error || `Request failed (${resp.status})`); }
    if (json?.success){ setFiles(list => list.map(f => (f.id===id || f.file_id===id) ? json.file : f)); onChange && onChange({ files: (files||[]).length }); }
  }

  async function deleteFile(id){
    if (!canEdit) return;
    if (!confirm('Delete this file and related items?')) return;
    const resp = await fetch(`/api/admin/quotes/${quoteId}/files/${id}`, { method:'DELETE' });
    const json = await parseJsonSafe(resp);
    if (!resp.ok) { throw new Error(json?.error || `Request failed (${resp.status})`); }
    if (json?.success){ setFiles(list => list.filter(f => f.id!==id && f.file_id!==id)); setSelected(s=>s.filter(x=>x!==id)); onChange && onChange({ totals: json.totals }); }
  }

  async function onUploadChange(e){
    if (!canEdit) return;
    const f = e.target.files; if (!f || !f.length) return;
    const form = new FormData();
    for (const file of f) form.append('files', file);
    setLoading(true);
    try {
      const resp = await fetch(`/api/admin/quotes/${quoteId}/files`, { method:'POST', body: form });
      const json = await parseJsonSafe(resp);
      if (!resp.ok) { throw new Error(json?.error || `Upload failed (${resp.status})`); }
      if (json?.success){ setFiles(list => [...list, ...(json.uploaded_files||[])]); onChange && onChange({ files: (files||[]).length + (json.uploaded_files?.length||0) }); }
    } catch (e) {
      setAnalysisError(e?.message || 'Upload error');
    } finally { setLoading(false); if (inputRef.current) inputRef.current.value = ''; }
  }

  function handleEditOpen(){ setShowEditFeedback(true); }
  function handleDiscardOpen(){ setShowDiscardFeedback(true); }

  return (
    <div className="rounded border bg-white p-4 mb-4">
      <h3 className="text-lg font-semibold mb-3">Files & Documents</h3>

      <div className="space-y-3 mb-4">
        {files.map(file => (
          <div key={file.id || file.file_id} className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-3">
              <input type="checkbox" disabled={!canEdit} checked={selected.includes(file.id||file.file_id)} onChange={()=> toggle(file.id||file.file_id)} className="w-4 h-4" />
              <div>
                <p className="font-medium">{file.filename}</p>
                <p className="text-sm text-gray-600">{file.analyzed ? '✅ Analyzed' : '⚠️ Not Analyzed'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select disabled={!canEdit} value={file.file_purpose || 'translate'} onChange={(e)=> updatePurpose(file.id||file.file_id, e.target.value)} className="p-1 border rounded text-sm">
                <option value="translate">To Translate</option>
                <option value="reference">Reference Only</option>
                <option value="already_translated">Already Translated</option>
              </select>
              {canEdit && <button onClick={()=> deleteFile(file.id||file.file_id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>}
            </div>
          </div>
        ))}
        {files.length === 0 && <div className="text-sm text-gray-500">No files</div>}
      </div>

      {canEdit && (
        <div className="mb-4 flex items-center gap-3">
          <input ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={onUploadChange} className="hidden" id="file-upload-admin" />
          <label htmlFor="file-upload-admin" className="inline-flex items-center px-3 py-2 rounded border cursor-pointer">📤 Upload More Files</label>
        </div>
      )}

    </div>
  );
}
