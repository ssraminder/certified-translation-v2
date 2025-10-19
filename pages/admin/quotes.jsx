import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { getServerSideAdminWithPermission } from '../../lib/withAdminPage';
import { canCreateQuote } from '../../lib/permissions';

export const getServerSideProps = getServerSideAdminWithPermission('quotes','view');

const STATUSES = [
  { key: 'all', label: 'All' },
  { key: 'hitl_required', label: 'HITL Required 🔴' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'ready', label: 'Ready' },
  { key: 'sent', label: 'Sent' },
  { key: 'converted', label: 'Converted' },
  { key: 'abandoned', label: 'Abandoned' },
];

function StatusBadge({ state }){
  const color = useMemo(() => {
    const s = String(state||'').toLowerCase();
    if (s === 'hitl_required') return 'bg-red-100 text-red-800';
    if (s === 'under_review') return 'bg-yellow-100 text-yellow-800';
    if (s === 'ready') return 'bg-green-100 text-green-800';
    if (s === 'sent') return 'bg-blue-100 text-blue-800';
    if (s === 'converted') return 'bg-purple-100 text-purple-800';
    if (s === 'abandoned') return 'bg-gray-100 text-gray-800';
    if (s === 'expired') return 'bg-orange-100 text-orange-800';
    return 'bg-slate-100 text-slate-800';
  }, [state]);
  return <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${color}`}>{state||'draft'}</span>;
}

function CreateQuoteModal({ open, onClose }){
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [intendedUse, setIntendedUse] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(e){
    e.preventDefault(); if (saving) return; setSaving(true);
    try {
      const resp = await fetch('/api/admin/quotes', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ name, email, source_lang: source, target_lang: target, intended_use: intendedUse }) });
      const json = await resp.json();
      if (!resp.ok || !json?.success) throw new Error(json?.error || `Request failed (${resp.status})`);
      window.location.href = `/admin/quotes/${json.quote_id}`;
    } catch (e) {
      alert(e.message || 'Failed to create quote');
    } finally { setSaving(false); }
  }
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded bg-white p-4">
        <div className="mb-3 text-lg font-semibold">Create New Quote</div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Customer Name</label>
            <input value={name} onChange={e=> setName(e.target.value)} className="w-full rounded border px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Customer Email</label>
            <input type="email" value={email} onChange={e=> setEmail(e.target.value)} className="w-full rounded border px-3 py-2" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Source Language</label>
              <input value={source} onChange={e=> setSource(e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Target Language</label>
              <input value={target} onChange={e=> setTarget(e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Intended Use (optional)</label>
            <input value={intendedUse} onChange={e=> setIntendedUse(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="rounded bg-cyan-600 px-3 py-2 text-white disabled:opacity-50">Create</button>
            <button type="button" onClick={onClose} className="rounded border px-3 py-2">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Page({ initialAdmin }){
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ quotes: [], total_count: 0, pages: 1, page: 1 });
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      params.set('page', String(page));
      params.set('limit', '20');
      fetch(`/api/admin/quotes?${params.toString()}`)
        .then(r => r.json())
        .then(json => setData(json))
        .finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [status, search, page, startDate, endDate]);

  function toggleSelect(quoteId) {
    setSelected(prev => {
      const newSet = new Set(prev);
      if (newSet.has(quoteId)) {
        newSet.delete(quoteId);
      } else {
        newSet.add(quoteId);
      }
      return newSet;
    });
  }

  function toggleSelectAll() {
    if (selected.size === (data.quotes?.length || 0)) {
      setSelected(new Set());
    } else {
      const newSet = new Set((data.quotes || []).map(q => q.id));
      setSelected(newSet);
    }
  }

  async function handleDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} quote(s)? This action cannot be undone.`)) return;

    setDeleting(true);
    try {
      const resp = await fetch('/api/admin/quotes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_ids: Array.from(selected) })
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Failed to delete quotes');
      setSelected(new Set());
      setPage(1);
      window.location.reload();
    } catch (e) {
      alert(e.message || 'Error deleting quotes');
    } finally {
      setDeleting(false);
    }
  }

  const allowCreate = canCreateQuote(initialAdmin?.role);

  return (
    <AdminLayout title="All Quotes" initialAdmin={initialAdmin}>
      <div className="rounded-lg bg-white p-4 ring-1 ring-gray-100">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {STATUSES.map(s => (
                <button key={s.key} onClick={() => { setStatus(s.key); setPage(1); }} className={`rounded-md border px-3 py-1 text-sm ${status===s.key? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>{s.label}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }} className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Search order #, name, email" />
              {allowCreate && (
                <button onClick={()=> setShowCreate(true)} className="rounded bg-cyan-600 text-white px-3 py-2 text-sm">+ New Quote</button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Start Date:</label>
              <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">End Date:</label>
              <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            {(startDate || endDate) && (
              <button onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }} className="text-sm text-gray-600 hover:text-gray-800 underline">Clear dates</button>
            )}
          </div>

          {selected.size > 0 && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded p-3">
              <span className="text-sm font-medium">{selected.size} quote(s) selected</span>
              <button onClick={handleDelete} disabled={deleting} className="rounded bg-red-600 text-white px-3 py-2 text-sm disabled:opacity-50 hover:bg-red-700">
                {deleting ? 'Deleting...' : 'Delete Selected'}
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 w-12">
                  <input
                    type="checkbox"
                    checked={data.quotes && data.quotes.length > 0 && selected.size === data.quotes.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded"
                  />
                </th>
                <th className="px-3 py-2">Order ID</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {(data.quotes||[]).map(q => (
                <tr key={q.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(q.id)}
                      onChange={() => toggleSelect(q.id)}
                      className="w-4 h-4 rounded"
                    />
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-900 cursor-pointer" onClick={()=>{ window.location.href = `/admin/quotes/${q.id}`; }}>{q.order_id}</td>
                  <td className="px-3 py-2 text-gray-700 cursor-pointer" onClick={()=>{ window.location.href = `/admin/quotes/${q.id}`; }}>{q.customer_name || '—'}<div className="text-xs text-gray-500">{q.customer_email || ''}</div></td>
                  <td className="px-3 py-2 cursor-pointer" onClick={()=>{ window.location.href = `/admin/quotes/${q.id}`; }}><StatusBadge state={q.quote_state} /></td>
                  <td className="px-3 py-2 text-right cursor-pointer" onClick={()=>{ window.location.href = `/admin/quotes/${q.id}`; }}>{q.total != null ? `$${Number(q.total).toFixed(2)}` : '—'}</td>
                  <td className="px-3 py-2 text-gray-600 cursor-pointer" onClick={()=>{ window.location.href = `/admin/quotes/${q.id}`; }}>{q.created_at ? new Date(q.created_at).toLocaleDateString() : ''}</td>
                </tr>
              ))}
              {(!loading && (!data.quotes || data.quotes.length === 0)) && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500">No quotes found</td></tr>
              )}
            </tbody>
          </table>
          {loading && <div className="p-3 text-sm text-gray-500">Loading...</div>}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <button className="rounded border px-3 py-1 text-sm disabled:opacity-50" onClick={()=> setPage(p=> Math.max(1, p-1))} disabled={page<=1}>Prev</button>
          <div className="text-sm text-gray-600">Page {data.page || page} of {data.pages || 1}</div>
          <button className="rounded border px-3 py-1 text-sm disabled:opacity-50" onClick={()=> setPage(p=> Math.min((data.pages||1), p+1))} disabled={page>=(data.pages||1)}>Next</button>
        </div>
      </div>
      <CreateQuoteModal open={showCreate} onClose={()=> setShowCreate(false)} />
    </AdminLayout>
  );
}
