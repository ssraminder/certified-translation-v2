import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

function num(v){ const n = Number(v); return Number.isFinite(n) ? n : 0; }
async function parseJsonSafe(resp){
  const ct = resp.headers.get('content-type') || '';
  if (ct.includes('application/json')){
    try { return await resp.json(); } catch { return null; }
  }
  try { const text = await resp.text(); return { error: text }; } catch { return null; }
}

export default function AnalysisModal({ open, quoteId, runId, onClose, onApplied, onDiscarded }){
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ lineItems: 0, totalPages: 0, billablePages: 0, estimatedCost: 0 });
  const [editComment, setEditComment] = useState('');
  const [discardComment, setDiscardComment] = useState('');
  const [mode, setMode] = useState('preview'); // preview | edit | discard | details
  const [certTypes, setCertTypes] = useState([]);
  const [status, setStatus] = useState('pending'); // pending | processing | ready | completed | error | discarded
  const [history, setHistory] = useState([]);
  const pollRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => { if (!open){ setItems([]); setSummary({ lineItems:0, totalPages:0, billablePages:0, estimatedCost:0 }); setError(''); setEditComment(''); setDiscardComment(''); setMode('preview'); setStatus('pending'); setHistory([]); } }, [open]);

  useEffect(() => { if (!open) return; (async ()=>{ try { if (supabase){ const { data } = await supabase.from('cert_types').select('name, amount'); const opts = (data||[]).map(d => ({ name: d.name, amount: Number(d.amount||0) })).filter(o=>o.name); setCertTypes(opts); } } catch {} })(); }, [open]);

  useEffect(() => {
    if (!open || !quoteId) return;
    let cancelled = false;

    async function fetchResults(){
      try {
        if (!runId) return;
        const resp = await fetch(`/api/analysis-runs/${encodeURIComponent(runId)}`);
        const json = await parseJsonSafe(resp);
        if (!resp.ok) throw new Error(json?.error || `Failed to load results (${resp.status})`);
        if (cancelled || mode === 'edit') return;
        const docs = Array.isArray(json?.documents) ? json.documents : [];
        setItems(docs.map(d => ({
          filename: d.filename,
          doc_type: d.document_type,
          total_pages: d.pages,
          billable_pages: d.billable_pages,
          unit_rate: 65, // UI-only default; server totals will use real values
          certification_type_name: null,
          certification_amount: 0
        })));
      } catch(e){ if (!cancelled) setError(e.message); }
    }

    async function fetchStatus(){
      try {
        if (!runId) return;
        const r = await fetch(`/api/analysis-runs/${encodeURIComponent(runId)}/status`);
        const j = await parseJsonSafe(r);
        if (cancelled) return;
        if (r.ok){ setStatus(j?.status || 'pending'); }
      } catch {}
    }

    async function fetchHistory(){
      try {
        const qs = new URLSearchParams({ quote_id: String(quoteId), limit: '10' });
        const r = await fetch(`/api/analysis-runs/history?${qs.toString()}`);
        const j = await parseJsonSafe(r);
        if (r.ok) setHistory(Array.isArray(j?.runs) ? j.runs : []);
      } catch {}
    }

    if (mode !== 'edit') { fetchResults(); fetchStatus(); fetchHistory(); }

    pollRef.current = setInterval(() => { if (mode !== 'edit'){ fetchStatus(); if (status === 'ready') fetchResults(); } }, 2000);

    return () => { cancelled = true; if (pollRef.current) clearInterval(pollRef.current); try { channelRef.current && supabase && supabase.removeChannel(channelRef.current); } catch {} };
  }, [open, quoteId, runId, mode]);

  function updateItem(idx, patch){ setItems(list => list.map((it,i) => i===idx ? { ...it, ...patch } : it)); }
  function setCert(idx, name){ const t = certTypes.find(c => c.name === name); updateItem(idx, { certification_type_name: name || '', certification_amount: t ? Number(t.amount||0) : 0 }); }
  function removeItem(idx){ setItems(list => list.filter((_,i)=> i!==idx)); }

  useEffect(() => {
    const rows = items || [];
    const billable = rows.reduce((a,b)=> a + num(b.billable_pages), 0);
    const pages = rows.reduce((a,b)=> a + (num(b.total_pages||0) || num(b.billable_pages)), 0);
    const estimate = rows.reduce((a,b)=> a + (num(b.billable_pages) * num(b.unit_rate)) + num(b.certification_amount||0), 0);
    setSummary({ lineItems: rows.length, totalPages: pages, billablePages: billable, estimatedCost: estimate });
  }, [items]);

  async function useAnalysis(){
    try {
      setLoading(true); setError('');
      const resp = await fetch(`/api/analysis-runs/${encodeURIComponent(runId)}/use`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ confirmed: true }) });
      const json = await parseJsonSafe(resp);
      if (!resp.ok || !json?.ok) throw new Error(json?.error || `Failed to apply analysis (${resp.status})`);
      onApplied && onApplied(json);
      onClose && onClose();
    } catch(e){ setError(e.message); } finally { setLoading(false); }
  }

  async function editAnalysis(){
    try {
      if (!editComment.trim()) { setError('Please add comments for LLM learning.'); return; }
      setLoading(true); setError('');
      await fetch(`/api/admin/quotes/${quoteId}/analysis-feedback`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'edit', feedback_text: editComment }) });
      const patches = items.map((it, idx) => ({ idx, patch: { document_type: it.doc_type, billable_pages: num(it.billable_pages), unit_rate: num(it.unit_rate), certification_type_name: it.certification_type_name || null, certification_amount: num(it.certification_amount||0) } }));
      for (const p of patches){
        await fetch(`/api/analysis-runs/${encodeURIComponent(runId)}/documents/${encodeURIComponent(p.idx)}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(p.patch) });
      }
      setMode('preview'); // stay open for review
    } catch(e){ setError(e.message); } finally { setLoading(false); }
  }

  async function discardAnalysis(){
    try {
      if (!discardComment.trim()) { setError('Please provide comments to discard.'); return; }
      setLoading(true); setError('');
      await fetch(`/api/admin/quotes/${quoteId}/analysis-feedback`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'discard', feedback_text: discardComment }) });
      await fetch(`/api/analysis-runs/${encodeURIComponent(runId)}/discard`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ reason: discardComment }) });
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
            <button disabled={loading} onClick={()=> setMode('details')} className="px-4 py-2 rounded bg-gray-200 text-gray-800 disabled:opacity-50">View Details</button>
            <button disabled={loading} onClick={()=> setMode('edit')} className="px-4 py-2 rounded bg-orange-600 text-white disabled:opacity-50">Edit Analysis</button>
            <button disabled={loading} onClick={useAnalysis} className="ml-auto px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50">Use Analysis</button>
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
                        <th className="px-2 py-1">Certification</th>
                        <th className="px-2 py-1">Cert Amount ($)</th>
                        <th className="px-2 py-1">Line Total ($)</th>
                        <th className="px-2 py-1">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => {
                        const lineTotal = (num(it.billable_pages) * num(it.unit_rate)) + num(it.certification_amount||0);
                        return (
                          <tr key={it.filename+idx} className="border-t">
                            <td className="px-2 py-1">{it.filename}</td>
                            <td className="px-2 py-1"><input type="text" value={it.doc_type||''} onChange={e=> updateItem(idx, { doc_type: e.target.value })} className="w-full rounded border px-2 py-1" /></td>
                            <td className="px-2 py-1"><input type="number" step="0.1" min="0.1" value={it.billable_pages||0} onChange={e=> updateItem(idx, { billable_pages: e.target.value })} className="w-24 rounded border px-2 py-1" /></td>
                            <td className="px-2 py-1"><input type="number" step="0.01" min="0" value={it.unit_rate||65} onChange={e=> updateItem(idx, { unit_rate: e.target.value })} className="w-28 rounded border px-2 py-1" /></td>
                            <td className="px-2 py-1">
                              <select value={it.certification_type_name||''} onChange={e=> setCert(idx, e.target.value)} className="w-full rounded border px-2 py-1">
                                <option value="">None</option>
                                {certTypes.map(ct => (<option key={ct.name} value={ct.name}>{ct.name}</option>))}
                              </select>
                            </td>
                            <td className="px-2 py-1"><input type="number" step="0.01" min="0" value={it.certification_amount||0} onChange={e=> updateItem(idx, { certification_amount: e.target.value })} className="w-28 rounded border px-2 py-1" /></td>
                            <td className="px-2 py-1">{lineTotal.toFixed(2)}</td>
                            <td className="px-2 py-1">
                              <button onClick={()=> removeItem(idx)} className="text-red-600 hover:text-red-800">Remove</button>
                            </td>
                          </tr>
                        );
                      })}
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
            <div className="space-y-3">
              <div className="rounded border p-3 text-sm text-gray-700">
                {status === 'pending' || status === 'processing' ? 'Processing…' : (items.length ? `${items.length} item(s) ready.` : 'Waiting for analysis results…')}
              </div>
              {items.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600">
                        <th className="px-2 py-1">Filename</th>
                        <th className="px-2 py-1">Doc Type</th>
                        <th className="px-2 py-1">Pages</th>
                        <th className="px-2 py-1">Billable</th>
                        <th className="px-2 py-1">Confidence</th>
                        <th className="px-2 py-1">Complexity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={it.filename+idx} className="border-t">
                          <td className="px-2 py-1">{it.filename}</td>
                          <td className="px-2 py-1">{it.doc_type || '-'}</td>
                          <td className="px-2 py-1">{it.total_pages ?? '-'}</td>
                          <td className="px-2 py-1">{it.billable_pages ?? '-'}</td>
                          <td className="px-2 py-1">{typeof it.average_confidence_score === 'number' ? it.average_confidence_score.toFixed(2) : '-'}</td>
                          <td className="px-2 py-1">{typeof it.complexity_multiplier === 'number' ? it.complexity_multiplier.toFixed(2) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <details className="rounded border p-3">
            <summary className="cursor-pointer text-sm font-medium">Analysis History</summary>
            <div className="mt-2 space-y-2">
              {history.map(h => (
                <div key={h.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${h.status==='ready'?'bg-green-100 text-green-800':h.discarded?'bg-gray-100 text-gray-600':'bg-yellow-100 text-yellow-800'}`}>{h.status}</span>
                    <span>Run v{h.version}</span>
                    <span className="text-gray-500">{new Date(h.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-2 py-1 rounded border" onClick={()=> { /* switch view to that run */ }} disabled={loading}>View</button>
                    {h.status === 'ready' && <button className="px-2 py-1 rounded border" onClick={()=> runId && useAnalysis()} disabled={loading}>Use</button>}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
