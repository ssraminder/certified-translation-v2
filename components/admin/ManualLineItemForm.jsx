import { useEffect, useState } from 'react';

export default function ManualLineItemForm({ open, onClose, quoteId, files, onCreated }){
  const [fileId, setFileId] = useState('');
  const [billablePages, setBillablePages] = useState('1');
  const [unitRate, setUnitRate] = useState('65');
  const [docType, setDocType] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(()=>{ if (!open){ setFileId(''); setBillablePages('1'); setUnitRate('65'); setDocType(''); setSourceLanguage(''); setTargetLanguage(''); } }, [open]);

  async function submit(e){
    e.preventDefault(); if (submitting) return; setSubmitting(true);
    try {
      const payload = {
        file_id: fileId || null,
        filename: (files||[]).find(f=> (f.file_id||f.id)===fileId)?.filename || null,
        billable_pages: Number(billablePages),
        unit_rate: Number(unitRate),
        doc_type: docType || undefined,
        source_language: sourceLanguage || undefined,
        target_language: targetLanguage || undefined
      };
      const resp = await fetch(`/api/admin/quotes/${quoteId}/line-items/manual`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      const json = await resp.json();
      if (json?.success){ onCreated && onCreated(json.line_item, json.totals); onClose && onClose(); }
    } finally { setSubmitting(false); }
  }

  if (!open) return null;
  const hasFiles = Array.isArray(files) && files.length > 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded bg-white p-4">
        <div className="mb-3 text-lg font-semibold">Add Manual Line Item</div>
        <form onSubmit={submit} className="space-y-3">
          {hasFiles && (
            <div>
              <label className="block text-sm font-medium mb-1">Select File (optional)</label>
              <select value={fileId} onChange={e=> setFileId(e.target.value)} className="w-full rounded border px-2 py-2">
                <option value="">-- None --</option>
                {(files||[]).map(f => (
                  <option key={f.file_id||f.id} value={f.file_id||f.id}>{f.filename}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Billable Pages</label>
              <input type="number" step="0.1" min="0.1" value={billablePages} onChange={e=> setBillablePages(e.target.value)} className="w-full rounded border px-2 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit Rate ($)</label>
              <input type="number" step="0.01" min="0.01" value={unitRate} onChange={e=> setUnitRate(e.target.value)} className="w-full rounded border px-2 py-2" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Document Name</label>
            <input type="text" value={docType} onChange={e=> setDocType(e.target.value)} className="w-full rounded border px-2 py-2" placeholder="e.g., Birth Certificate" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Source Language</label>
              <input type="text" value={sourceLanguage} onChange={e=> setSourceLanguage(e.target.value)} className="w-full rounded border px-2 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Target Language</label>
              <input type="text" value={targetLanguage} onChange={e=> setTargetLanguage(e.target.value)} className="w-full rounded border px-2 py-2" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={submitting} className="rounded bg-cyan-600 px-3 py-2 text-white disabled:opacity-50">Add Line Item</button>
            <button type="button" onClick={onClose} className="rounded border px-3 py-2">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
