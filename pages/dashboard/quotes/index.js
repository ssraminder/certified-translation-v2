import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { useAuth } from '../../../middleware/auth';
import Link from 'next/link';

export default function QuotesListPage() {
  const { user, loading } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created_desc');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, status, sort]);

  async function fetchList() {
    try {
      setLoadingData(true);
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (sort) params.set('sort', sort);
      if (search) params.set('search', search);
      const res = await fetch(`/api/dashboard/quotes?${params.toString()}`);
      const data = await res.json();
      setQuotes(data.quotes || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error('Failed to fetch quotes:', err);
    } finally {
      setLoadingData(false);
    }
  }

  const tabs = useMemo(() => ([
    { key: 'all', label: `All (${stats?.all ?? 0})` },
    { key: 'draft', label: `Draft (${stats?.draft ?? 0})` },
    { key: 'open', label: `Open (${stats?.open ?? 0})` },
    { key: 'under_review', label: `Under Review (${stats?.under_review ?? 0})` },
    { key: 'expired', label: `Expired (${stats?.expired ?? 0})` },
  ]), [stats]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this quote?')) return;
    try {
      const res = await fetch(`/api/dashboard/quotes/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to delete');
      await fetchList();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleRegenerate = async (id) => {
    try {
      const res = await fetch(`/api/dashboard/quotes/${id}/regenerate`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to regenerate');
      await fetchList();
    } catch (e) {
      alert(e.message);
    }
  };

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
        <p className="text-gray-600 mt-1">Manage your certified translation quotes</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setStatus(t.key)} className={`px-3 py-1 rounded-lg text-sm font-medium border ${status === t.key ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-white text-gray-700 border-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex items-center">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search quote number" className="w-full border rounded-lg px-3 py-2" />
          <button onClick={fetchList} className="ml-2 px-3 py-2 bg-cyan-500 text-white rounded-lg">Search</button>
        </div>
        <div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full border rounded-lg px-3 py-2">
            <option value="created_desc">Newest</option>
            <option value="created_asc">Oldest</option>
            <option value="expires_soon">Expires Soon</option>
          </select>
        </div>
        <div className="text-right">
          <Link href="/order/step-1" className="inline-block px-4 py-2 bg-cyan-600 text-white rounded-lg font-semibold">Start New Quote</Link>
        </div>
      </div>

      {quotes.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-600">No quotes found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quotes.map((q) => (
            <div key={q.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-gray-900">{q.quote_number || String(q.id).slice(0, 8)}</div>
                  <div className="text-sm text-gray-600">{formatDate(q.created_at)}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {q.hitl_required && <span className="px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-800">HITL</span>}
                  <StatusBadge state={q.quote_state} />
                </div>
              </div>
              <div className="mt-3 text-sm text-gray-700 space-y-1">
                <div>🌐 {q.source_language} → {q.target_language}</div>
                <div>📄 {q.document_count} document{q.document_count === 1 ? '' : 's'}</div>
                {q.total != null && <div className="font-semibold text-gray-900">${Number(q.total).toFixed(2)} CAD</div>}
                {q.days_until_expiry != null && <div className={q.days_until_expiry <= 3 ? 'text-red-600' : 'text-gray-600'}>Expires in {q.days_until_expiry} day{q.days_until_expiry === 1 ? '' : 's'}</div>}
              </div>
              <div className="mt-4 flex gap-2">
                <Link href={`/dashboard/quotes/${q.id}`} className="px-3 py-2 bg-gray-100 rounded-lg text-sm">View</Link>
                {q.quote_state === 'draft' && (
                  <Link href={`/order/step-3?quote=${q.id}`} className="px-3 py-2 bg-cyan-500 text-white rounded-lg text-sm">Resume Quote</Link>
                )}
                {q.quote_state === 'expired' && (
                  <button onClick={() => handleRegenerate(q.id)} className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm">Regenerate</button>
                )}
                <button onClick={() => handleDelete(q.id)} className="ml-auto px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

function StatusBadge({ state }) {
  const colors = {
    draft: 'bg-gray-100 text-gray-700',
    open: 'bg-blue-100 text-blue-700',
    sent: 'bg-blue-100 text-blue-700',
    pending_review: 'bg-purple-100 text-purple-700',
    under_review: 'bg-purple-100 text-purple-700',
    reviewed: 'bg-purple-100 text-purple-700',
    expired: 'bg-orange-100 text-orange-700',
    converted: 'bg-green-100 text-green-700',
    paid: 'bg-green-100 text-green-700',
  };
  const cls = colors[state] || 'bg-gray-100 text-gray-700';
  return <span className={`px-2 py-1 rounded text-xs font-semibold ${cls}`}>{formatStatus(state)}</span>;
}

function formatStatus(s) {
  if (!s) return '';
  return String(s).split('_').map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ');
}

function formatDate(dateString) {
  try { return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch { return ''; }
}
