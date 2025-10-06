import AdminLayout from '../../../components/admin/AdminLayout';
import { useEffect, useMemo, useState } from 'react';
import { getServerSideAdminWithPermission } from '../../../lib/withAdminPage';
export const getServerSideProps = getServerSideAdminWithPermission('hitl_quotes','edit');

function round2(v){ return Math.round(Number(v||0)*100)/100; }

export default function Page({ initialAdmin }){
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quote, setQuote] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [form, setForm] = useState({ billable_pages: 1, source_language_id: null, target_language_id: null, custom_language: '', certification_type_id: null, intended_use_id: null, country: '', delivery_option: 'standard', status: 'draft' });
  const [feedback, setFeedback] = useState({ enabled: false, type: 'ocr_error', text: '' });
  const [lineItems, setLineItems] = useState([]);
  const [locked, setLocked] = useState(false);
  const [docForm, setDocForm] = useState({ url: '', filename: '' });

  const id = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : null;

  function computeTotals(items){
    let translation = 0; let certification = 0;
    for (const it of items){
      const pages = Number(it.billable_pages||0);
      const rate = Number((it.unit_rate_override ?? it.unit_rate) || 0);
      const cert = Number(it.certification_amount||0);
      translation += pages*rate; certification += cert;
    }
    const subtotal = round2(translation + certification);
    const tax = round2(subtotal * 0.05);
    const total = round2(subtotal + tax);
    return { translation: round2(translation), certification: round2(certification), subtotal, tax, total };
  }

  const totals = useMemo(()=>computeTotals(lineItems), [lineItems]);

  async function load(){
    setLoading(true); setError('');
    try{
      const res = await fetch(`/api/admin/hitl/${id}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setQuote(data);
      setAnalysis(data?.n8n?.analysis || null);
      setForm(f => ({ ...f, billable_pages: data?.n8n?.analysis?.billable_pages || 1, country: data?.details?.country || '' }));
      setLineItems(Array.isArray(data?.line_items) ? data.line_items : []);
      setLocked(((data?.hitl?.state||'').toLowerCase() === 'sent'));
    }catch(e){ setError(e.message); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{ if(id) load(); }, [id]);

  async function fetchN8n(){
    const btn = document.getElementById('fetch-n8n-btn');
    if (btn) btn.disabled = true;
    try{
      const res = await fetch(`/api/admin/hitl/${id}/fetch-n8n`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) { setAnalysis(data.analysis || null); if (data.analysis?.billable_pages) setForm(f=>({ ...f, billable_pages: data.analysis.billable_pages })); }
      else alert(data.error || 'Failed');
    } finally { if (btn) btn.disabled = false; }
  }

  async function save(status='draft'){
    const payload = { ...form, status };
    const res = await fetch(`/api/admin/hitl/${id}/quote`, { method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Failed');
    await load();
    if (status === 'send') alert('Quote sent to customer.');
  }

  async function submitFeedback(){
    if (!feedback.enabled) return;
    const payload = { feedback_type: feedback.type, feedback_text: feedback.text, n8n_result: analysis, correct_values: null };
    const res = await fetch(`/api/admin/hitl/${id}/feedback`, { method: 'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) { const d = await res.json(); alert(d.error || 'Failed to submit feedback'); }
    else alert('Feedback submitted');
  }

  async function requestInfo(){
    const message = prompt('Enter message to customer');
    if (!message) return;
    const res = await fetch(`/api/admin/hitl/${id}/request-info`, { method: 'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ message }) });
    const d = await res.json(); if (!res.ok) alert(d.error||'Failed'); else alert('Request sent');
  }

  async function reject(){
    const reason = prompt('Enter rejection reason'); if (!reason) return;
    const message = prompt('Optional message');
    const res = await fetch(`/api/admin/hitl/${id}/reject`, { method: 'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ reason, message }) });
    const d = await res.json(); if (!res.ok) alert(d.error||'Failed'); else alert('Quote rejected');
  }

  async function addLineItem(){
    const filename = prompt('Filename (optional)') || '';
    const pages = Number(prompt('Billable pages')||'0');
    const rate = Number(prompt('Unit rate')||'0');
    if (!pages || pages <= 0) return alert('Pages must be > 0');
    const payload = { filename, billable_pages: pages, unit_rate: rate };
    const res = await fetch(`/api/admin/hitl/${id}/line-items`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
    const d = await res.json();
    if (!res.ok) return alert(d.error || 'Failed');
    await load();
  }

  async function updateLineItem(it){
    const res = await fetch(`/api/admin/hitl/${id}/line-items`, { method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(it) });
    const d = await res.json(); if (!res.ok) return alert(d.error||'Failed');
    await load();
  }

  async function removeLineItem(it){
    if (!confirm('Remove this line item?')) return;
    const res = await fetch(`/api/admin/hitl/${id}/line-items`, { method:'DELETE', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ id: it.id }) });
    const d = await res.json(); if (!res.ok) return alert(d.error||'Failed');
    await load();
  }

  async function addDocumentUrl(){
    if (!docForm.url) return alert('Enter URL');
    const payload = { url: docForm.url, filename: docForm.filename || 'document.pdf' };
    const res = await fetch(`/api/admin/hitl/${id}/documents`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
    const d = await res.json(); if (!res.ok) return alert(d.error||'Failed');
    setDocForm({ url:'', filename:'' });
    await load();
  }

  if (loading) return (<AdminLayout title="HITL Editor" initialAdmin={initialAdmin}><div className="rounded-lg bg-white p-6">Loading…</div></AdminLayout>);
  if (error) return (<AdminLayout title="HITL Editor" initialAdmin={initialAdmin}><div className="rounded-lg bg-white p-6 text-red-600">{error}</div></AdminLayout>);

  return (
    <AdminLayout title={`HITL Editor - ${quote?.quote_number || id}`} initialAdmin={initialAdmin}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-4 ring-1 ring-gray-100">
          <h2 className="font-semibold text-gray-900 mb-2">Customer</h2>
          <div className="text-sm text-gray-700">{quote?.customer?.name || '—'}</div>
          <div className="text-sm text-gray-700">{quote?.customer?.email || '—'}</div>
          <div className="text-sm text-gray-700">{quote?.customer?.phone || '—'}</div>
          <div className="mt-4">
            <h3 className="font-semibold text-gray-900 mb-2">Documents</h3>
            <ul className="space-y-1 text-sm">
              {(quote?.documents||[]).map(d => (
                <li key={d.id} className="flex items-center justify-between"><span>{d.filename}</span>{d.url && <a href={d.url} target="_blank" rel="noreferrer" className="text-blue-600">Download</a>}</li>
              ))}
            </ul>
            <div className="mt-2 flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-600">Add Document by URL</label>
                <input value={docForm.url} onChange={e=>setDocForm(f=>({...f, url:e.target.value}))} placeholder="https://..." className="mt-1 w-full rounded-md border-gray-300 text-sm" />
              </div>
              <div className="w-40">
                <label className="block text-xs text-gray-600">Filename</label>
                <input value={docForm.filename} onChange={e=>setDocForm(f=>({...f, filename:e.target.value}))} placeholder="document.pdf" className="mt-1 w-full rounded-md border-gray-300 text-sm" />
              </div>
              <button disabled={locked} onClick={addDocumentUrl} className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">Add</button>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-700">
            <div>Quote #: {quote?.quote_number}</div>
            <div>Source: {quote?.details?.source_language}</div>
            <div>Target: {quote?.details?.target_language}</div>
            <div>Intended Use: {quote?.details?.intended_use}</div>
            <div>Certification: {quote?.details?.certification_type}</div>
            <div>Country: {quote?.details?.country}</div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 ring-1 ring-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 mb-2">N8N Analysis Results</h2>
            <button id="fetch-n8n-btn" onClick={fetchN8n} className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white">Fetch Latest Results</button>
          </div>
          <div className="text-xs text-gray-500 mb-3">Status: {quote?.n8n?.status || 'unknown'}</div>
          {analysis ? (
            <pre className="text-xs bg-gray-50 p-3 rounded border overflow-auto" style={{ maxHeight: 260 }}>{JSON.stringify(analysis, null, 2)}</pre>
          ) : (
            <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-3">N8N analysis not available</div>
          )}
          <div className="mt-4 border-t pt-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={feedback.enabled} onChange={e=>setFeedback(f=>({...f, enabled:e.target.checked}))} /> Submit feedback</label>
            {feedback.enabled && (
              <div className="mt-2 space-y-2">
                <select value={feedback.type} onChange={e=>setFeedback(f=>({...f, type:e.target.value}))} className="w-full rounded-md border-gray-300 text-sm">
                  <option value="ocr_error">OCR Error</option>
                  <option value="language_detection">Language Detection</option>
                  <option value="page_count">Page Count</option>
                  <option value="other">Other</option>
                </select>
                <textarea value={feedback.text} onChange={e=>setFeedback(f=>({...f, text:e.target.value}))} rows={4} className="w-full rounded-md border-gray-300 text-sm" placeholder="Describe the issue"></textarea>
                <button onClick={submitFeedback} className="rounded-md border px-3 py-1.5 text-sm">Submit Feedback</button>
              </div>
            )}
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 ring-1 ring-gray-100">
          <h2 className="font-semibold text-gray-900 mb-2">Quote Editor</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Billable Pages</label>
              <input type="number" min={1} max={1000} value={form.billable_pages} onChange={e=>setForm(f=>({...f, billable_pages: Number(e.target.value||1)}))} className="mt-1 w-full rounded-md border-gray-300 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Country</label>
              <input type="text" value={form.country} onChange={e=>setForm(f=>({...f, country:e.target.value}))} className="mt-1 w-full rounded-md border-gray-300 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Delivery Option</label>
              <select value={form.delivery_option} onChange={e=>setForm(f=>({...f, delivery_option:e.target.value}))} className="mt-1 w-full rounded-md border-gray-300 text-sm">
                <option value="standard">Standard</option>
                <option value="rush">Rush</option>
              </select>
            </div>
            <div className="border rounded-md">
              <div className="flex items-center justify-between px-3 py-2">
                <h3 className="font-semibold text-gray-900">Line Items</h3>
                <button disabled={locked} onClick={addLineItem} className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">Add Line</button>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-3 py-2">File</th>
                      <th className="px-3 py-2">Pages</th>
                      <th className="px-3 py-2">Unit Rate</th>
                      <th className="px-3 py-2">Override</th>
                      <th className="px-3 py-2">Reason</th>
                      <th className="px-3 py-2">Line Total</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((it) => {
                      const overriddenRate = (it.unit_rate_override ?? it.unit_rate) || 0;
                      const base = Number(it.unit_rate||0);
                      const delta = round2(overriddenRate - base);
                      const total = round2((Number(it.billable_pages||0) * overriddenRate) + Number(it.certification_amount||0));
                      return (
                        <tr key={it.id} className="border-t">
                          <td className="px-3 py-2">
                            <input disabled={locked} value={it.filename||''} onChange={e=>setLineItems(items=>items.map(x=>x.id===it.id?{...x, filename:e.target.value}:x))} className="w-40 rounded-md border-gray-300" />
                          </td>
                          <td className="px-3 py-2">
                            <input disabled={locked} type="number" min={1} value={it.billable_pages||0} onChange={e=>setLineItems(items=>items.map(x=>x.id===it.id?{...x, billable_pages:Number(e.target.value||0)}:x))} className="w-24 rounded-md border-gray-300" />
                          </td>
                          <td className="px-3 py-2 text-gray-700">${'{'}Number(it.unit_rate||0).toFixed(2){'}'}{delta!==0 && (<span className={delta>0?"text-emerald-700":"text-red-700"}> ({delta>0?'+':''}{delta.toFixed(2)})</span>)}</td>
                          <td className="px-3 py-2">
                            <input disabled={locked} type="number" step="0.01" value={it.unit_rate_override ?? ''} onChange={e=>setLineItems(items=>items.map(x=>x.id===it.id?{...x, unit_rate_override: e.target.value===''?null:Number(e.target.value)}:x))} className="w-28 rounded-md border-gray-300" />
                          </td>
                          <td className="px-3 py-2">
                            <input disabled={locked} value={it.override_reason||''} onChange={e=>setLineItems(items=>items.map(x=>x.id===it.id?{...x, override_reason:e.target.value}:x))} className="w-48 rounded-md border-gray-300" />
                          </td>
                          <td className="px-3 py-2">${'{'}total.toFixed(2){'}'}</td>
                          <td className="px-3 py-2 space-x-2">
                            <button disabled={locked} onClick={()=>updateLineItem(it)} className="rounded-md border px-2 py-1 disabled:opacity-50">Save</button>
                            <button disabled={locked} onClick={()=>removeLineItem(it)} className="rounded-md border border-red-300 text-red-700 px-2 py-1 disabled:opacity-50">Remove</button>
                          </td>
                        </tr>
                      );
                    })}
                    {lineItems.length===0 && (
                      <tr><td colSpan={7} className="px-3 py-4 text-sm text-gray-500">No line items. Add one.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-800">
              <div className="flex items-center justify-between"><span>Subtotal</span><span>${'{'}totals.subtotal.toFixed(2){'}'}</span></div>
              <div className="flex items-center justify-between"><span>Tax</span><span>${'{'}totals.tax.toFixed(2){'}'}</span></div>
              <div className="border-t my-2"></div>
              <div className="flex items-center justify-between font-semibold"><span>Total</span><span>${'{'}totals.total.toFixed(2){'}'}</span></div>
            </div>
            <div className="flex items-center gap-2">
              <button disabled={locked} onClick={()=>save('draft')} className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50">Save as Draft</button>
              <button disabled={locked} onClick={()=>save('send')} className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">Send to Customer</button>
            </div>
            <div className="border-t pt-3 mt-3 flex items-center gap-2">
              <button onClick={requestInfo} className="rounded-md border px-3 py-1.5 text-sm">Request More Info</button>
              <button disabled={locked} onClick={reject} className="rounded-md border border-red-300 text-red-700 px-3 py-1.5 text-sm disabled:opacity-50">Reject Quote</button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
