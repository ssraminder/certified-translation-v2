import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { getServerSideAdmin } from '../../lib/withAdminPage';

export const getServerSideProps = getServerSideAdmin;

function StatCard({ color, icon, label, value, href }){
  return (
    <a href={href} className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-100 hover:shadow transition">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">{label}</div>
          <div className={`mt-1 text-3xl font-bold ${color}`}>{value}</div>
        </div>
        <div className="h-10 w-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-700">{icon}</div>
      </div>
    </a>
  );
}

export default function AdminDashboard({ initialAdmin }){
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load(){
      try{
        const r = await fetch('/api/admin/dashboard/stats');
        const j = await r.json();
        if (!active) return;
        if (!r.ok) throw new Error(j.error || 'Failed to load stats');
        setStats(j);
      }catch(e){ if(active) setError(e.message); }
    }
    load();
    return () => { active = false; };
  }, []);

  const cards = [
    { label: 'Pending HITL Quotes', value: stats?.pending_hitl ?? '—', color: 'text-orange-600', href: '/admin/hitl', icon: (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M12 22a1 1 0 01-1-1v-2.126A8.003 8.003 0 014 11V6a4 4 0 118 0v5a8.003 8.003 0 017 7.874V21a1 1 0 01-1 1H12zM8 4a2 2 0 00-2 2v5a6 6 0 0012 0V6a2 2 0 10-4 0v5a2 2 0 11-4 0V6a2 2 0 00-2-2z"/></svg>) },
    { label: 'Active Orders', value: stats?.active_orders ?? '—', color: 'text-blue-600', href: '/admin/orders', icon: (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M3 3h18l-1.5 13.5A2 2 0 0117.51 18H8.49a2 2 0 01-1.99-1.5L5 9H3V7h2l1-4z"/></svg>) },
    { label: "Today's Revenue", value: stats?.todays_revenue != null ? `$${Number(stats.todays_revenue).toFixed(2)}` : '—', color: 'text-green-600', href: '/admin/analytics', icon: (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1zm1 17.93V19h-2v-.07A8.001 8.001 0 014.07 13H5v-2h-.93A8.001 8.001 0 0111 4.07V4h2v.07A8.001 8.001 0 0119.93 11H19v2h.93A8.001 8.001 0 0113 18.93z"/></svg>) },
    { label: 'Pending Messages', value: stats?.pending_messages ?? 0, color: 'text-purple-600', href: '/admin/reports', icon: (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M4 4h16v12H5.17L4 17.17V4z"/></svg>) },
  ];

  const ordersByStatus = stats?.orders_by_status || {};
  const statusList = [
    { key: 'pending', label: 'Pending', color: 'bg-gray-300' },
    { key: 'processing', label: 'Processing', color: 'bg-blue-300' },
    { key: 'draft_review', label: 'Draft Review', color: 'bg-yellow-300' },
    { key: 'certification', label: 'Certification', color: 'bg-purple-300' },
    { key: 'completed', label: 'Completed', color: 'bg-green-300' },
  ];

  return (
    <AdminLayout title="Dashboard" initialAdmin={initialAdmin} pendingCounts={{ hitl: stats?.pending_hitl || 0, orders: stats?.active_orders || 0 }}>
      <section className="mb-6">
        <div className="rounded-lg bg-white p-4 ring-1 ring-gray-100">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-semibold text-gray-900">Welcome back{initialAdmin?.full_name ? `, ${initialAdmin.full_name}` : ''}</div>
              {initialAdmin?.role && <div className="text-sm text-gray-600">Role: <span className="font-medium">{initialAdmin.role}</span></div>}
              {initialAdmin?.last_login_at && <div className="text-xs text-gray-500">Last login: {new Date(initialAdmin.last_login_at).toLocaleString()}</div>}
            </div>
          </div>
        </div>
      </section>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((c, i) => (
          <StatCard key={i} {...c} />
        ))}
      </section>

      <section className="mt-6 rounded-lg bg-white p-5 ring-1 ring-gray-100">
        <div className="mb-3 text-sm font-semibold text-gray-800">Orders by Status</div>
        <div className="space-y-3">
          {statusList.map(s => (
            <div key={s.key} className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded ${s.color}`} />
              <div className="w-40 text-sm text-gray-700">{s.label}</div>
              <div className="flex-1">
                <div className="h-2 rounded bg-gray-100">
                  <div className={`h-2 rounded bg-gray-300`} style={{ width: `${Math.min(100, (ordersByStatus[s.key]||0) * 10)}%` }} />
                </div>
              </div>
              <div className="w-10 text-right text-sm text-gray-700">{ordersByStatus[s.key] || 0}</div>
            </div>
          ))}
        </div>
      </section>
    </AdminLayout>
  );
}
