import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { useAuth } from '../../../middleware/auth';
import StatusBadge from '../../../components/dashboard/StatusBadge';
import EmptyState from '../../../components/dashboard/EmptyState';
import Link from 'next/link';

function formatDate(d){ try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return ''; } }
function currency(n){ const x = Number(n||0); return `$${x.toFixed(2)} CAD`; }

export default function OrdersListPage(){
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ all: 0, pending_payment: 0, in_progress: 0, completed: 0, delivered: 0 });
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('created_desc');
  const [search, setSearch] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  const tabs = useMemo(() => ([
    { key: 'all', label: `All Orders (${stats.all})`, color: 'border-cyan-500' },
    { key: 'pending_payment', label: `Pending Payment (${stats.pending_payment})`, color: 'border-orange-500' },
    { key: 'in_progress', label: `In Progress (${stats.in_progress})`, color: 'border-blue-500' },
    { key: 'completed', label: `Completed (${stats.completed})`, color: 'border-green-500' },
    { key: 'delivered', label: `Delivered (${stats.delivered})`, color: 'border-purple-500' },
  ]), [stats]);

  useEffect(() => { if (user) fetchList(); }, [user, status, sort]);

  async function fetchList(){
    try {
      setLoadingData(true);
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (sort) params.set('sort', sort);
      if (search) params.set('search', search);
      const res = await fetch(`/api/dashboard/orders?${params.toString()}`);
      const data = await res.json();
      setOrders(data.orders || []);
      setStats(data.stats || {});
    } catch (e) {
      console.error(e);
    } finally { setLoadingData(false); }
  }

  if (loading || loadingData) {
    return (
      <DashboardLayout user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600">Track your translation orders</p>
        </div>
        <Link href="/order/step-1" className="px-4 py-2 bg-cyan-500 text-white rounded-lg">New Order</Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setStatus(t.key)} className={`px-3 py-1 rounded-lg text-sm font-medium border-b-4 ${status === t.key ? t.color : 'border-transparent'} bg-white text-gray-700`}>{t.label}</button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex items-center">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by order number..." className="w-full border rounded-lg px-3 py-2" />
          <button onClick={fetchList} className="ml-2 px-3 py-2 bg-cyan-500 text-white rounded-lg">Search</button>
        </div>
        <div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full border rounded-lg px-3 py-2">
            <option value="created_desc">Newest First</option>
            <option value="created_asc">Oldest First</option>
            <option value="total_desc">Highest Price</option>
            <option value="total_asc">Lowest Price</option>
          </select>
        </div>
      </div>

      {orders.length === 0 ? (
        <EmptyState icon="📦" title="No orders yet" description="Start by creating a quote and completing payment" action={{ label: 'Get Started', href: '/order/step-1' }} />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {orders.map((o) => (
            <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="block">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{o.order_number}</div>
                    <div className="text-sm text-gray-600">{formatDate(o.created_at)}</div>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-700">
                  <div>📄 {o.document_count} document{o.document_count === 1 ? '' : 's'}</div>
                  <div>{o.delivery_date ? `📅 Delivery: ${formatDate(o.delivery_date)}` : '📅 Delivery: —'}</div>
                  <div className="md:text-right col-span-2 md:col-span-1 font-semibold">{currency(o.total)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
