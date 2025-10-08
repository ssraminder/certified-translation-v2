import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '../../components/admin/AdminLayout';
import Spinner from '../../components/dashboard/Spinner';
import { formatForDisplay as formatPhone } from '../../lib/formatters/phone';
import { getServerSideAdminWithPermission } from '../../lib/withAdminPage';

export const getServerSideProps = getServerSideAdminWithPermission('users','view');

export default function Page({ initialAdmin }){
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [sort, setSort] = useState('created');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ users: [], total: 0, total_pages: 1 });

  useEffect(() => {
    const controller = new AbortController();
    async function load(){
      setLoading(true);
      const qs = new URLSearchParams({ email, phone, name, sort, order, page: String(page), limit: String(limit) });
      const res = await fetch(`/api/admin/users?${qs.toString()}`, { signal: controller.signal });
      const json = res.ok ? await res.json() : { users: [], total: 0, total_pages: 1 };
      setData(json);
      setLoading(false);
    }
    load().catch(()=>setLoading(false));
    return () => controller.abort();
  }, [email, phone, name, sort, order, page, limit]);

  function toggleOrder(col){
    if (sort === col) setOrder(order === 'asc' ? 'desc' : 'asc');
    else { setSort(col); setOrder(col === 'name' ? 'asc' : 'desc'); }
  }

  const headers = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'created', label: 'Created' },
    { key: 'last_login', label: 'Last Login' },
  ];

  return (
    <AdminLayout title="Users" initialAdmin={initialAdmin}>
      <div className="rounded-lg bg-white p-4 ring-1 ring-gray-100">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-600">Manage your customers.</div>
          <Link href="/admin/users/new" className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Create New User</Link>
        </div>

        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input value={email} onChange={e=>{ setEmail(e.target.value); setPage(1); }} placeholder="Filter by email" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input value={phone} onChange={e=>{ setPhone(e.target.value); setPage(1); }} placeholder="Filter by phone (partial ok)" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input value={name} onChange={e=>{ setName(e.target.value); setPage(1); }} placeholder="Filter by name" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <select value={sort} onChange={e=>{ setSort(e.target.value); setPage(1); }} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="created">Created Date</option>
              <option value="last_login">Last Login</option>
            </select>
            <select value={order} onChange={e=>{ setOrder(e.target.value); setPage(1); }} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {headers.map(h => (
                  <th key={h.key} className="px-4 py-2 text-left font-medium text-gray-700">
                    <button onClick={()=>toggleOrder(h.key)} className="inline-flex items-center gap-1 text-gray-700">
                      {h.label}
                      {sort === h.key && <span className="text-xs">{order === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={headers.length} className="px-4 py-6 text-center"><Spinner /></td>
                </tr>
              )}
              {!loading && data.users?.length === 0 && (
                <tr>
                  <td colSpan={headers.length} className="px-4 py-10 text-center text-gray-500">No users found</td>
                </tr>
              )}
              {!loading && data.users?.map(u => (
                <tr key={u.id}>
                  <td className="px-4 py-2 font-medium text-gray-900">{u.full_name}</td>
                  <td className="px-4 py-2 text-gray-700">{u.email}</td>
                  <td className="px-4 py-2 text-gray-700">{u.phone ? formatPhone(u.phone) : '—'}</td>
                  <td className="px-4 py-2 text-gray-700">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-2 text-gray-700">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">Total: {data.total}</div>
          <div className="flex items-center gap-2">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50">Prev</button>
            <div className="text-sm">Page {page} of {data.total_pages}</div>
            <button disabled={page>=data.total_pages} onClick={()=>setPage(p=>p+1)} className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
