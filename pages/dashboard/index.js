import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../middleware/auth';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  async function fetchDashboardData() {
    try {
      const res = await fetch('/api/dashboard/overview');
      const data = await res.json();
      setQuotes(data.active_quotes || []);
      setOrders(data.recent_orders || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoadingData(false);
    }
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.first_name}!</h1>
        <p className="text-gray-600 mt-2">Here's what's happening with your translations</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard title="Active Quotes" value={stats.active_quotes} icon="📋" color="blue" />
          <StatCard title="In Progress" value={stats.in_progress_orders} icon="⏳" color="yellow" />
          <StatCard title="Completed" value={stats.completed_orders} icon="✓" color="green" />
          <StatCard title="Total Spent" value={`$${stats.total_spent}`} icon="💰" color="purple" />
        </div>
      )}

      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Active Quotes</h2>
          <Link href="/dashboard/quotes" className="text-cyan-500 hover:text-cyan-600 font-semibold text-sm">
            View All →
          </Link>
        </div>

        {quotes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quotes.slice(0, 3).map((quote) => (
              <QuoteCard key={quote.quote_id || quote.id} quote={quote} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="📋"
            title="No active quotes"
            description="Start a new quote to get certified translation pricing"
            action={{ label: 'Get a Quote', href: '/order/step-1' }}
          />
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
          <Link href="/dashboard/orders" className="text-cyan-500 hover:text-cyan-600 font-semibold text-sm">
            View All →
          </Link>
        </div>

        {orders.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y">
            {orders.slice(0, 5).map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <EmptyState icon="📦" title="No orders yet" description="Your completed orders will appear here" />
        )}
      </div>
    </DashboardLayout>
  );
}

function StatCard({ title, value, icon, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${colors[color]}`}>{icon}</div>
      </div>
    </div>
  );
}

function QuoteCard({ quote }) {
  const stateColors = {
    draft: 'bg-gray-100 text-gray-600',
    awaiting_review: 'bg-purple-100 text-purple-600',
    sent: 'bg-blue-100 text-blue-600',
    expired: 'bg-orange-100 text-orange-600',
  };

  return (
    <Link href={`/dashboard/quotes/${quote.quote_id || quote.id}`}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="font-semibold text-gray-900">{quote.quote_number || (quote.quote_id || '').slice(0, 8)}</p>
            <p className="text-sm text-gray-600">{formatDate(quote.created_at)}</p>
          </div>
          <span className={`px-2 py-1 rounded text-xs font-semibold ${stateColors[quote.status] || 'bg-gray-100 text-gray-600'}`}>
            {formatStatus(quote.status)}
          </span>
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          <p>📄 {quote.document_count} document{quote.document_count > 1 ? 's' : ''}</p>
          <p>🌐 {quote.source_lang} → {quote.target_lang}</p>
          {quote.total ? <p className="font-semibold text-gray-900">${Number(quote.total).toFixed(2)} CAD</p> : null}
        </div>
      </div>
    </Link>
  );
}

function OrderRow({ order }) {
  return (
    <Link href={`/dashboard/orders/${order.id}`}>
      <div className="p-4 hover:bg-gray-50 transition cursor-pointer">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-semibold text-gray-900">{order.order_number}</p>
            <p className="text-sm text-gray-600 mt-1">
              {order.source_lang || '—'} → {order.target_lang || '—'}
            </p>
          </div>
          <div className="text-right">
            <StatusBadge status={order.status} />
            <p className="text-sm text-gray-600 mt-1">${Number(order.total || 0).toFixed(2)} CAD</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function StatusBadge({ status }) {
  const colors = {
    pending_payment: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-600',
    draft_review: 'bg-yellow-100 text-yellow-600',
    certification: 'bg-purple-100 text-purple-600',
    completed: 'bg-green-100 text-green-600',
    paid: 'bg-green-100 text-green-700',
    payment_failed: 'bg-red-100 text-red-700',
    refunded: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {formatStatus(status)}
    </span>
  );
}

function EmptyState({ icon, title, description, action }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{description}</p>
      {action ? (
        <Link href={action.href}>
          <button className="bg-cyan-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-cyan-600 transition">{action.label}</button>
        </Link>
      ) : null}
    </div>
  );
}

function formatDate(dateString) {
  try {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function formatStatus(status) {
  if (!status) return '';
  return String(status)
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
