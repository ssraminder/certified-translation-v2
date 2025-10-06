import AdminLayout from '../../components/admin/AdminLayout';
import AdminLayout from '../../components/admin/AdminLayout';
import { useEffect, useState } from 'react';
import { getServerSideAdminWithPermission } from '../../lib/withAdminPage';
export const getServerSideProps = getServerSideAdminWithPermission('hitl_quotes','view');
export default function Page({ initialAdmin }){
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quotes, setQuotes] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, in_progress: 0, completed: 0 });
  const [filters, setFilters] = useState({ status: 'pending', assigned: 'all', sort: 'newest', page: 1 });

  async function fetchQueue() {
    setLoading(true); setError('');
    const params = new URLSearchParams(filters);
    try {
      const res = await fetch(`/api/admin/hitl/queue?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setQuotes(data.quotes || []);
      setCounts({ pending: data.pending||0, in_progress: data.in_progress||0, completed: data.completed||0 });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchQueue(); }, [filters.status, filters.assigned, filters.sort, filters.page]);

  function assignSelf(id){
    fetch(`/api/admin/hitl/${id}/assign`, { method: 'PUT', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ admin_user_id: initialAdmin.id })})
      .then(()=>fetchQueue());
  }

  return (
    <AdminLayout title="HITL Queue" initialAdmin={initialAdmin}>
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800">Pending: {counts.pending}</span>
        <button onClick={fetchQueue} className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800">Refresh</button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select value={filters.status} onChange={(e)=>setFilters(f=>({...f,status:e.target.value,page:1}))} className="mt-1 w-full rounded-md border-gray-300 text-sm">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Assigned</label>
          <select value={filters.assigned} onChange={(e)=>setFilters(f=>({...f,assigned:e.target.value,page:1}))} className="mt-1 w-full rounded-md border-gray-300 text-sm">
            <option value="all">All</option>
            <option value="unassigned">Unassigned</option>
            <option value="me">Assigned to Me</option>
            <option value="others">Assigned to Others</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Sort</label>
          <select value={filters.sort} onChange={(e)=>setFilters(f=>({...f,sort:e.target.value,page:1}))} className="mt-1 w-full rounded-md border-gray-300 text-sm">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
        <div className="flex items-end"><button onClick={()=>setFilters(f=>({...f,page:1}))} className="h-9 rounded-md border px-3 text-sm">Apply</button></div>
      </div>

      <div className="rounded-lg bg-white ring-1 ring-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Quote</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Submitted</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Documents</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Languages</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Reason</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Assigned</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading && (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-sm text-gray-500">Loading…</td></tr>
            )}
            {!loading && quotes.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-600">No quotes in HITL queue</td></tr>
            )}
            {!loading && quotes.map(q => (
              <tr key={q.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900"><a href={`/admin/hitl/${q.id}`} className="text-blue-600 hover:underline">{q.quote_number}</a></td>
                <td className="px-4 py-3 text-sm text-gray-700">{q.customer?.name || '—'}<div className="text-xs text-gray-500">{q.customer?.email || ''}</div></td>
                <td className="px-4 py-3 text-sm text-gray-700">{new Date(q.submitted_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{q.documents?.count || 0}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{q.languages?.source || ''} → {q.languages?.target || 'Custom'}</td>
                <td className="px-4 py-3 text-sm"><span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">{q.reason || '—'}</span></td>
                <td className="px-4 py-3 text-sm text-gray-700">{q.assigned_to_admin_id ? 'Assigned' : 'Unassigned'}</td>
                <td className="px-4 py-3 text-sm">
                  {q.status === 'pending' && <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800">Pending</span>}
                  {q.status === 'in_progress' && <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">In Progress</span>}
                  {q.status === 'completed' && <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">Completed</span>}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {!q.assigned_to_admin_id && <button onClick={()=>assignSelf(q.id)} className="rounded-md border px-2 py-1 text-xs">Assign to me</button>}
                  <a href={`/admin/hitl/${q.id}`} className="ml-2 rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white">Review</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
    </AdminLayout>
  );
}
