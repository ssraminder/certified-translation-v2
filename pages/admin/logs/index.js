import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import RoleBadge from '../../../components/admin/RoleBadge';
import { getServerSideAdminWithPermission } from '../../../lib/withAdminPage';

function ActionTypeBadge({ actionType }){
  const a = String(actionType || '').toLowerCase();
  let color = 'bg-gray-100 text-gray-800';
  if (['login','logout','login_failed','otp_requested','magic_link_requested','session_expired'].some(t=>a.startsWith(t))) color = 'bg-blue-100 text-blue-800';
  else if (a.startsWith('admin_')) color = 'bg-purple-100 text-purple-800';
  else if (a.startsWith('quote_') || a.includes('hitl')) color = 'bg-orange-100 text-orange-800';
  else if (a.startsWith('order_') || a.includes('file_uploaded')) color = 'bg-green-100 text-green-800';
  else if (a.startsWith('message_') || a.includes('note')) color = 'bg-cyan-100 text-cyan-800';
  else if (a.includes('settings') || a.startsWith('language_') || a.startsWith('tier_') || a.startsWith('certification_') || a.startsWith('intended_use_') || a.startsWith('email_template_')) color = 'bg-gray-200 text-gray-900';
  else if (a.startsWith('user_')) color = 'bg-yellow-100 text-yellow-800';
  return <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${color}`}>{actionType}</span>;
}

function LogDetails({ details }){
  const [open, setOpen] = useState(false);
  if (!details) return null;
  return (
    <div>
      <button className="text-slate-600 underline" onClick={()=>setOpen(v=>!v)}>{open ? 'Hide' : 'Details'}</button>
      {open && (
        <pre className="mt-2 max-h-60 overflow-auto rounded bg-slate-50 p-2 text-xs text-slate-800">{JSON.stringify(details, null, 2)}</pre>
      )}
    </div>
  );
}

function formatDate(iso){ try{ return new Date(iso).toLocaleString(); }catch{ return iso; } }

export default function LogsPage({ initialAdmin }){
  const [filters, setFilters] = useState({ admin_id:'', action_type:'', target_type:'', target_id:'', ip_address:'', range:'last30', start_date:'', end_date:'' });
  const [data, setData] = useState({ logs: [], total: 0, page: 1, total_pages: 1 });
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState([]);

  function computeRange(r){
    const now = new Date();
    const end = new Date(now.getTime());
    const start = new Date(now.getTime());
    if (r === 'today'){ start.setHours(0,0,0,0); }
    else if (r === 'last7'){ start.setDate(start.getDate()-7); }
    else { start.setDate(start.getDate()-30); }
    return { start: start.toISOString(), end: end.toISOString() };
  }

  const query = useMemo(()=>{
    const params = new URLSearchParams();
    for (const k of ['admin_id','action_type','target_type','target_id','ip_address']){
      if (filters[k]) params.set(k, filters[k]);
    }
    const { start, end } = computeRange(filters.range || 'last30');
    params.set('start_date', filters.start_date || start);
    params.set('end_date', filters.end_date || end);
    params.set('page', String(data.page || 1));
    params.set('limit', '50');
    return params.toString();
  }, [filters, data.page]);

  async function load(page=1){
    setLoading(true);
    try{
      const u = `/api/admin/logs?${query}`.replace(/page=\d+/, `page=${page}`);
      const res = await fetch(u);
      const json = await res.json();
      setData(json);
    } finally{ setLoading(false); }
  }

  useEffect(()=>{ load(1); }, [query]);

  useEffect(()=>{
    (async ()=>{
      try{
        const res = await fetch('/api/admin/admins?limit=100&status=all');
        const json = await res.json();
        setAdmins(json.admins || []);
      } catch {}
    })();
  }, []);

  function onExport(){
    const u = `/api/admin/logs/export?${query}`;
    window.location.href = u;
  }

  return (
    <AdminLayout title="Activity Logs" initialAdmin={initialAdmin} pendingCounts={{}}>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Quick Range</label>
          <select className="mt-1 rounded border px-2 py-1 text-sm" value={filters.range} onChange={e=>setFilters(f=>({ ...f, range: e.target.value }))}>
            <option value="today">Today</option>
            <option value="last7">Last 7 Days</option>
            <option value="last30">Last 30 Days</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Admin</label>
          <select className="mt-1 rounded border px-2 py-1 text-sm" value={filters.admin_id} onChange={e=>setFilters(f=>({ ...f, admin_id: e.target.value }))}>
            <option value="">All Admins</option>
            {admins.map(a => (
              <option key={a.id} value={a.id}>{a.full_name} ({a.role})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Action Type</label>
          <input className="mt-1 rounded border px-2 py-1 text-sm" placeholder="e.g. order_status_changed" value={filters.action_type} onChange={e=>setFilters(f=>({ ...f, action_type: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Target Type</label>
          <input className="mt-1 rounded border px-2 py-1 text-sm" placeholder="order | quote | user | admin | settings" value={filters.target_type} onChange={e=>setFilters(f=>({ ...f, target_type: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Target ID</label>
          <input className="mt-1 rounded border px-2 py-1 text-sm" placeholder="uuid/number" value={filters.target_id} onChange={e=>setFilters(f=>({ ...f, target_id: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">IP Address</label>
          <input className="mt-1 rounded border px-2 py-1 text-sm" placeholder="192.168.." value={filters.ip_address} onChange={e=>setFilters(f=>({ ...f, ip_address: e.target.value }))} />
        </div>
        <div className="ml-auto">
          <button onClick={onExport} className="rounded bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700">Export CSV</button>
        </div>
      </div>

      <div className="overflow-hidden rounded border">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Timestamp</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Admin</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Action</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Target</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Details</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading && (
              <tr><td className="p-4 text-sm text-slate-500" colSpan={6}>Loading...</td></tr>
            )}
            {!loading && data.logs.length === 0 && (
              <tr><td className="p-4 text-sm text-slate-500" colSpan={6}>No logs found</td></tr>
            )}
            {data.logs.map((log) => (
              <tr key={log.id}>
                <td className="px-3 py-2 text-sm text-slate-700">{formatDate(log.created_at)}</td>
                <td className="px-3 py-2 text-sm text-slate-700">
                  <div className="flex items-center gap-2">
                    <span>{log.admin_name}</span>
                    {log.admin_role && <RoleBadge role={log.admin_role} />}
                  </div>
                </td>
                <td className="px-3 py-2 text-sm text-slate-700"><ActionTypeBadge actionType={log.action_type} /></td>
                <td className="px-3 py-2 text-sm text-slate-700">{[log.target_type, log.target_id].filter(Boolean).join(' / ')}</td>
                <td className="px-3 py-2 text-sm text-slate-700"><LogDetails details={log.details} /></td>
                <td className="px-3 py-2 text-sm text-slate-700">{log.ip_address || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-slate-600">Page {data.page} of {data.total_pages} • {data.total} total</div>
        <div className="flex gap-2">
          <button className="rounded border px-3 py-1 text-sm" disabled={data.page <= 1} onClick={()=>load(data.page - 1)}>Previous</button>
          <button className="rounded border px-3 py-1 text-sm" disabled={data.page >= data.total_pages} onClick={()=>load(data.page + 1)}>Next</button>
        </div>
      </div>
    </AdminLayout>
  );
}

export const getServerSideProps = getServerSideAdminWithPermission('logs', 'view');
