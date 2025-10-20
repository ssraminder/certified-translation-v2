import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { getServerSideAdminWithPermission } from '../../lib/withAdminPage';

export const getServerSideProps = getServerSideAdminWithPermission('orders','view');

const STATUSES = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'draft_review', label: 'Draft Review' },
  { key: 'certification', label: 'Certification' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function StatusBadge({ status }){
  const color = useMemo(() => {
    const s = String(status || '').toLowerCase();
    if (s === 'pending') return 'bg-gray-100 text-gray-800';
    if (s === 'processing') return 'bg-blue-100 text-blue-800';
    if (s === 'draft_review') return 'bg-yellow-100 text-yellow-800';
    if (s === 'certification') return 'bg-purple-100 text-purple-800';
    if (s === 'completed') return 'bg-green-100 text-green-800';
    if (s === 'cancelled') return 'bg-red-100 text-red-800';
    return 'bg-slate-100 text-slate-800';
  }, [status]);
  return <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${color}`}>{status || 'unknown'}</span>;
}

export default function Page({ initialAdmin }){
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ orders: [], total_count: 0, pages: 1, page: 1 });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
      fetch(`/api/admin/orders?${params.toString()}`)
        .then(r => r.json())
        .then(json => setData(json))
        .finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [status, search, page, startDate, endDate]);

  return (
    <AdminLayout title="Orders" initialAdmin={initialAdmin}>
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
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Order ID</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {(data.orders||[]).map(o => (
                <tr key={o.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900 cursor-pointer" onClick={()=>{ window.location.href = `/admin/orders/${o.id}`; }}>{o.order_number || o.order_id || '—'}</td>
                  <td className="px-3 py-2 text-gray-700 cursor-pointer" onClick={()=>{ window.location.href = `/admin/orders/${o.id}`; }}>{o.customer_name || '—'}<div className="text-xs text-gray-500">{o.customer_email || ''}</div></td>
                  <td className="px-3 py-2 cursor-pointer" onClick={()=>{ window.location.href = `/admin/orders/${o.id}`; }}><StatusBadge status={o.status} /></td>
                  <td className="px-3 py-2 text-right cursor-pointer" onClick={()=>{ window.location.href = `/admin/orders/${o.id}`; }}>{o.total != null ? `$${Number(o.total).toFixed(2)}` : (o.total_amount != null ? `$${Number(o.total_amount).toFixed(2)}` : '—')}</td>
                  <td className="px-3 py-2 text-gray-600 cursor-pointer" onClick={()=>{ window.location.href = `/admin/orders/${o.id}`; }}>{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
              {(!loading && (!data.orders || data.orders.length === 0)) && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-500">No orders found</td></tr>
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
    </AdminLayout>
  );
}
