import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

function num(v){ const n = Number(v); return Number.isFinite(n) ? n : 0; }

export default function AnalysisModal({ open, quoteId, runId, onClose, onApplied, onDiscarded }){
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ lineItems: 0, totalPages: 0, billablePages: 0, estimatedCost: 0 });
  const [editComment, setEditComment] = useState('');
  const [discardComment, setDiscardComment] = useState('');
  const [mode, setMode] = useState('preview'); // preview | edit
  const [certTypes, setCertTypes] = useState([]);
  const pollRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => { if (!open){ setItems([]); setSummary({ lineItems:0, totalPages:0, estimatedCost:0 }); setError(''); setEditComment(''); setDiscardComment(''); setMode('preview'); } }, [open]);

  useEffect(() => { if (!open) return; (async ()=>{ try { if (supabase){ const { data } = await supabase.from('cert_types').select('name, amount'); const opts = (data||[]).map(d => ({ name: d.name, amount: Number(d.amount||0) })).filter(o=>o.name); setCertTypes(opts); } } catch {} })(); }, [open]);

  useEffect(() => {
    if (!open || !quoteId) return;
    let cancelled = false;

    async function fetchPreview(){
      try {
        const qs = new URLSearchParams();
        if (runId) qs.set('run_id', String(runId));
        qs.set('preview','1');
        const resp = await fetch(`/api/admin/quotes/${quoteId}/line-items/from-analysis?${qs.toString()}`);
        const json = await resp.json();
        if (!resp.ok) throw new Error(json?.error || 'Failed to load preview');
        if (cancelled) return;
        const rows = Array.isArray(json?.items) ? json.items : [];
        setItems(rows);
        const billable = rows.reduce((a,b)=> a + num(b.billable_pages), 0);
        const pages = rows.reduce((a,b)=> a + (num(b.total_pages||0) || num(b.billable_pages)), 0);
        const estimate = rows.reduce((a,b)=> a + (num(b.billable_pages) * num(b.unit_rate)) + num(b.certification_amount||0), 0);
        setSummary({ lineItems: rows.length, totalPages: pages, billablePages: billable, estimatedCost: estimate });
      } catch(e){ if (!cancelled) setError(e.message); }
    }

    fetchPreview();

    // Try realtime; fallback to polling
    try {
      if (supabase) {
        const channel = supabase.channel('analysis_preview')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'ocr_analysis', filter: `quote_id=eq.${quoteId}` }, fetchPreview)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'quote_sub_orders', filter: `quote_id=eq.${quoteId}` }, fetchPreview)
          .subscribe();
        channelRef.current = channel;
      }
    } catch {}

    pollRef.current = setInterval(fetchPreview, 3000);

    return () => { cancelled = true; if (pollRef.current) clearInterval(pollRef.current); try { channelRef.current && supabase && supabase.removeChannel(channelRef.current); } catch {} };
  }, [open, quoteId, runId]);

  function updateItem(idx, patch){ setItems(list => list.map((it,i) => i===idx ? { ...it, ...patch } : it)); }

  async function useAnalysis(){
    try {
      setLoading(true); setError('');
      const resp = await fetch(`/api/admin/quotes/${quoteId}/line-items/from-analysis`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ source: 'auto', run_id: runId, mark_active: true }) });
      const json = await resp.json();
      if (!resp.ok || !json?.success) throw new Error(json?.error || 'Failed to create line items');
      onApplied && onApplied(json);
      onClose && onClose();
    } catch(e){ setError(e.message); } finally { setLoading(false); }
  }

  async function editAnalysis(){
    try {
      if (!editComment.trim()) { setError('Please add comments for LLM learning.'); return; }
      setLoading(true); setError('');
      await fetch(`/api/admin/quotes/${quoteId}/analysis-feedback`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'edit', feedback_text: editComment }) });
      const payload = { source:'edited', run_id: runId, mark_active: true, items: items.map(it => ({ filename: it.filename, doc_type: it.doc_type, billable_pages: num(it.billable_pages), unit_rate: num(it.unit_rate), certification_amount: num(it.certification_amount||0) })) };
      const resp = await fetch(`/api/admin/quotes/${quoteId}/line-items/from-analysis`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      const json = await resp.json();
      if (!resp.ok || !json?.success) throw new Error(json?.error || 'Failed to create line items');
      onApplied && onApplied(json);
      onClose && onClose();
    } catch(e){ setError(e.message); } finally { setLoading(false); }
  }

  async function discardAnalysis(){
    try {
      if (!discardComment.trim()) { setError('Please provide comments to discard.'); return; }
      setLoading(true); setError('');
      await fetch(`/api/admin/quotes/${quoteId}/analysis-feedback`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'discard', feedback_text: discardComment }) });
      const qs = new URLSearchParams(); if (runId) qs.set('run_id', String(runId));
      await fetch(`/api/admin/quotes/${quoteId}/analysis-results?${qs.toString()}`, { method:'DELETE' });
      onDiscarded && onDiscarded();
      onClose && onClose();
    } catch(e){ setError(e.message); } finally { setLoading(false); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-5xl bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold">Analysis Results</div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="p-4">
          {error && <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800">{error}</div>}

          <div className="mb-3 grid grid-cols-4 gap-3 text-sm">
            <div className="rounded border p-3"><div className="text-gray-600">Documents</div><div className="text-lg font-semibold">{summary.lineItems}</div></div>
            <div className="rounded border p-3"><div className="text-gray-600">Total Pages</div><div className="text-lg font-semibold">{summary.totalPages}</div></div>
            <div className="rounded border p-3"><div className="text-gray-600">Billable Pages</div><div className="text-lg font-semibold">{summary.billablePages}</div></div>
            <div className="rounded border p-3"><div className="text-gray-600">Estimate</div><div className="text-lg font-semibold">${summary.estimatedCost.toFixed(2)}</div></div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <button disabled={loading} onClick={useAnalysis} className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50">Use Analysis</button>
            <button disabled={loading} onClick={()=> setMode('edit')} className="px-4 py-2 rounded bg-orange-600 text-white disabled:opacity-50">Edit Analysis</button>
            <button disabled={loading} onClick={()=> setMode('discard')} className="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-50">Discard Analysis</button>
          </div>

          {mode === 'edit' && (
            <div className="space-y-3">
              <div className="rounded border p-3">
                <div className="text-sm text-gray-700 mb-2">Edit each item below, then add comments and Confirm.</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600">
                        <th className="px-2 py-1">Filename</th>
                        <th className="px-2 py-1">Doc Type</th>
                        <th className="px-2 py-1">Billable Pages</th>
                        <th className="px-2 py-1">Unit Rate ($)</th>
                        <th className="px-2 py-1">Certification ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={it.filename+idx} className="border-t">
                          <td className="px-2 py-1">{it.filename}</td>
                          <td className="px-2 py-1"><input type="text" value={it.doc_type||''} onChange={e=> updateItem(idx, { doc_type: e.target.value })} className="w-full rounded border px-2 py-1" /></td>
                          <td className="px-2 py-1"><input type="number" step="0.1" min="0.1" value={it.billable_pages||0} onChange={e=> updateItem(idx, { billable_pages: e.target.value })} className="w-24 rounded border px-2 py-1" /></td>
                          <td className="px-2 py-1"><input type="number" step="0.01" min="0" value={it.unit_rate||65} onChange={e=> updateItem(idx, { unit_rate: e.target.value })} className="w-28 rounded border px-2 py-1" /></td>
                          <td className="px-2 py-1"><input type="number" step="0.01" min="0" value={it.certification_amount||0} onChange={e=> updateItem(idx, { certification_amount: e.target.value })} className="w-28 rounded border px-2 py-1" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Comments for LLM learning</label>
                <textarea value={editComment} onChange={e=> setEditComment(e.target.value)} className="w-full rounded border px-2 py-2 h-24" placeholder="Explain edits to help model improve" />
              </div>
              <div className="flex justify-end">
                <button disabled={loading || !editComment.trim()} onClick={editAnalysis} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">Confirm</button>
              </div>
            </div>
          )}

          {mode === 'discard' && (
            <div className="space-y-3">
              <div className="text-sm text-gray-700">Provide a reason for discarding this analysis. This will be stored for training and QA.</div>
              <textarea value={discardComment} onChange={e=> setDiscardComment(e.target.value)} className="w-full rounded border px-2 py-2 h-24" placeholder="Reason for discarding" />
              <div className="flex justify-end">
                <button disabled={loading || !discardComment.trim()} onClick={discardAnalysis} className="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-50">Confirm Discard</button>
              </div>
            </div>
          )}

          {mode === 'preview' && (
            items.length === 0 ? (
              <div className="rounded border p-3 text-sm text-gray-700">Waiting for analysis results… Items will appear here automatically.</div>
            ) : (
              <div className="rounded border p-3 text-sm text-gray-700">{items.length} item(s) ready. Click Edit Analysis to review and adjust before using.</div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
