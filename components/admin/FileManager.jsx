import { useEffect, useMemo, useRef, useState } from 'react';

export default function FileManager({ quoteId, initialFiles, canEdit = true, onChange }){
  const [files, setFiles] = useState(initialFiles || []);
  const [selected, setSelected] = useState([]);
  const [batchMode, setBatchMode] = useState('single');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(()=>{ setFiles(initialFiles || []); }, [initialFiles]);

  function toggle(id){ setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id]); }

  async function updatePurpose(id, purpose){
    if (!canEdit) return;
    const resp = await fetch(`/api/admin/quotes/${quoteId}/files/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ file_purpose: purpose }) });
    const json = await resp.json();
    if (json?.success){ setFiles(list => list.map(f => (f.id===id || f.file_id===id) ? json.file : f)); onChange && onChange({ files: (files||[]).length }); }
  }

  async function deleteFile(id){
    if (!canEdit) return;
    if (!confirm('Delete this file and related items?')) return;
    const resp = await fetch(`/api/admin/quotes/${quoteId}/files/${id}`, { method:'DELETE' });
    const json = await resp.json();
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
      const json = await resp.json();
      if (json?.success){ setFiles(list => [...list, ...(json.uploaded_files||[])]); onChange && onChange({ files: (files||[]).length + (json.uploaded_files?.length||0) }); }
    } finally { setLoading(false); if (inputRef.current) inputRef.current.value = ''; }
  }

  async function triggerAnalysis(){
    if (!canEdit) return;
    if (!selected.length) return;
    setLoading(true);
    try {
      const resp = await fetch(`/api/admin/quotes/${quoteId}/analyze`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ file_ids: selected.map(id=>{ const f = files.find(x=>x.id===id || x.file_id===id); return f?.file_id || id; }), batch_mode: batchMode, replace_existing: true }) });
      const json = await resp.json();
      if (json?.success){ onChange && onChange({}); }
    } finally { setLoading(false); }
  }

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

      {selected.length > 0 && canEdit && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <div className="mb-2 text-sm font-medium">Analysis Options</div>
          <div className="space-x-4 mb-3 text-sm">
            <label className="inline-flex items-center gap-2"><input type="radio" name="batch_mode" value="single" checked={batchMode==='single'} onChange={()=> setBatchMode('single')} /> Single</label>
            <label className="inline-flex items-center gap-2"><input type="radio" name="batch_mode" value="batch" checked={batchMode==='batch'} onChange={()=> setBatchMode('batch')} /> Batch</label>
          </div>
          <button disabled={loading} onClick={triggerAnalysis} className="w-full rounded bg-cyan-600 px-3 py-2 text-white disabled:opacity-50">{loading ? 'Processing…' : `▶ Run Analysis (${selected.length} files)`}</button>
        </div>
      )}
    </div>
  );
}
