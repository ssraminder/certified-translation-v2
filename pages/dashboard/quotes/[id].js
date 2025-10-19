import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../components/DashboardLayout';
import { useAuth } from '../../../middleware/auth';
import Link from 'next/link';

export default function QuoteDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading } = useAuth();
  const [quote, setQuote] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  async function fetchDetail() {
    try {
      setLoadingData(true);
      const res = await fetch(`/api/dashboard/quotes/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load quote');
      setQuote(data);
    } catch (e) {
      alert(e.message);
      router.push('/dashboard/quotes');
    } finally {
      setLoadingData(false);
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this quote?')) return;
    try {
      const res = await fetch(`/api/dashboard/quotes/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to delete');
      router.push('/dashboard/quotes');
    } catch (e) { alert(e.message); }
  };

  const handleRegenerate = async () => {
    try {
      const res = await fetch(`/api/dashboard/quotes/${id}/regenerate`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to regenerate');
      await fetchDetail();
    } catch (e) { alert(e.message); }
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

  if (!quote) return null;

  const detailsReady = !!(quote.quote_results && ((quote.quote_results.line_items && quote.quote_results.line_items.length) || quote.quote_results.pricing));
  const showHitl = !detailsReady;

  return (
    <DashboardLayout user={user}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/dashboard/quotes" className="text-sm text-cyan-600">← Back to Quotes</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Quote {quote.quote_number || String(quote.id).slice(0,8)}</h1>
          <div className="text-gray-600 mt-1">{formatDate(quote.created_at)} • <StatusBadge state={quote.quote_state} /></div>
        </div>
        <div className="flex gap-2">
          {quote.quote_state === 'expired' && (
            <button onClick={handleRegenerate} className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg">Regenerate</button>
          )}
          <button onClick={handleDelete} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg">Delete</button>
        </div>
      </div>

      {showHitl && (
        <div className="mb-6 p-4 rounded-lg border border-purple-200 bg-purple-50">
          <div className="font-semibold text-purple-800">Human-in-the-Loop Review</div>
          <div className="text-sm text-purple-800 mt-1">{quote.hitl_reason || 'Your quote is undergoing a manual review to ensure accuracy. We will notify you when it is ready.'}</div>
          {quote.hitl_estimated_completion && (
            <div className="text-sm text-purple-800 mt-1">Estimated completion: {formatDateTime(quote.hitl_estimated_completion)}</div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <DetailRow label="Languages" value={`${quote.source_language} → ${quote.target_language}`} />
              <DetailRow label="Intended Use" value={quote.intended_use_name || quote.intended_use || '—'} />
              <DetailRow label="Certification Type" value={quote.certification_type_name || quote.certification_type_code || '—'} />
              <DetailRow label="Delivery Option" value={quote.delivery_option || '—'} />
              <DetailRow label="Delivery Date" value={quote.delivery_date ? formatDate(quote.delivery_date) : '—'} />
              <DetailRow label="Expires" value={quote.expires_at ? `${formatDate(quote.expires_at)} (${quote.days_until_expiry} day${quote.days_until_expiry===1?'':'s'})` : '—'} />
            </div>
          </section>

          <section className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Documents</h2>
            {quote.documents?.length ? (
              <div className="divide-y border rounded-lg">
                {quote.documents.map((d) => (
                  <div key={d.id} className="p-3 flex items-center justify-between text-sm">
                    <div className="truncate">
                      <div className="font-medium text-gray-900 truncate">{d.original_filename}</div>
                      <div className="text-gray-600">{(d.file_size || 0).toLocaleString()} bytes • {d.content_type || 'file'}</div>
                    </div>
                    {d.file_url && (
                      <a href={d.file_url} target="_blank" rel="noreferrer" className="px-3 py-1 bg-gray-100 rounded">View</a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-600">No documents uploaded.</div>
            )}
          </section>

          <section className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Line Items</h2>
            {quote.quote_results?.line_items?.length ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2">Description</th>
                    <th className="py-2">Pages</th>
                    <th className="py-2">Rate</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.quote_results.line_items.map((li, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="py-2">{li.description}</td>
                      <td className="py-2">{li.pages ?? '—'}</td>
                      <td className="py-2">{li.unit_rate != null ? `$${Number(li.unit_rate).toFixed(2)}` : '—'}</td>
                      <td className="py-2 text-right">{li.line_total != null ? `$${Number(li.line_total).toFixed(2)}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-sm text-gray-600">No line items available.</div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          {quote.quote_state === 'draft' && !['converted', 'paid'].includes(quote.quote_state) && (
            <section className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-3">Actions</h2>
              <Link href={`/order/step-3?quote=${quote.id}`}>
                <button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-2 rounded-lg font-semibold">Resume Quote</button>
              </Link>
            </section>
          )}

          {quote.quote_state === 'draft' && (
            <section className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-3">Progress</h2>
              <ol className="space-y-2">
                {[1,2,3,4].map((step) => {
                  const isCompleted = step <= (quote.last_completed_step || 1);
                  const isNext = step === ((quote.last_completed_step || 1) + 1);
                  return (
                    <li key={step} className="flex items-center gap-2 text-sm">
                      <span className={`flex items-center justify-center w-6 h-6 rounded-full text-white text-xs ${isCompleted ? 'bg-green-500' : isNext ? 'bg-cyan-500' : 'bg-gray-300'}`}>
                        {isCompleted ? '✓' : step}
                      </span>
                      <span className={`${isCompleted ? 'text-gray-900' : isNext ? 'text-cyan-700' : 'text-gray-500'}`}>
                        {step === 1 ? 'Upload Documents' : step === 2 ? 'Details' : step === 3 ? 'Shipping & Options' : 'Review Quote'}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          <section className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Pricing</h2>
            {quote.quote_results?.pricing ? (
              <div className="text-sm text-gray-700 space-y-2">
                <Row label="Subtotal" value={money(quote.quote_results.pricing.subtotal)} />
                <Row label="Tax" value={money(quote.quote_results.pricing.tax)} />
                <Row label="Shipping" value={money(quote.quote_results.pricing.shipping)} />
                <div className="border-t my-2"></div>
                <Row label={<span className="font-semibold text-gray-900">Total</span>} value={<span className="font-semibold text-gray-900">{money(quote.quote_results.pricing.total)}</span>} />
              </div>
            ) : (
              <div className="text-sm text-gray-600">No pricing available.</div>
            )}
          </section>

          <section className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Activity</h2>
            {quote.activity_log?.length ? (
              <div className="space-y-2 text-sm">
                {quote.activity_log.map((a, idx) => (
                  <div key={idx} className="flex items-start justify-between">
                    <div className="text-gray-700">{formatStatus(a.event_type)}</div>
                    <div className="text-gray-500">{formatDateTime(a.created_at)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-600">No recent activity.</div>
            )}
          </section>
        </aside>
      </div>
    </DashboardLayout>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <div className="text-gray-500">{label}</div>
      <div className="text-gray-900 font-medium">{value}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div>{label}</div>
      <div>{value}</div>
    </div>
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

function money(v) {
  if (v == null) return '—';
  return `$${Number(v).toFixed(2)} CAD`;
}

function formatStatus(s) {
  if (!s) return '';
  return String(s).split('_').map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ');
}

function formatDate(dateString) {
  try { return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch { return ''; }
}

function formatDateTime(dateString) {
  try { return new Date(dateString).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
}
