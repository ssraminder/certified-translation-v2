import { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { useAuth } from '../../../middleware/auth';
import StatusBadge from '../../../components/dashboard/StatusBadge';
import Link from 'next/link';

function formatDate(d){ try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return ''; } }
function formatDateTime(d){ try { return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch { return ''; } }
function currency(n){ const x = Number(n||0); return `$${x.toFixed(2)} CAD`; }
function bytes(b){ const n = Number(b||0); if (n < 1024) return `${n} B`; if (n < 1024*1024) return `${(n/1024).toFixed(1)} KB`; if (n < 1024*1024*1024) return `${(n/(1024*1024)).toFixed(1)} MB`; return `${(n/(1024*1024*1024)).toFixed(1)} GB`; }

export default function OrderDetailPage(){
  const { user, loading } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { if (!loading && user) fetchDetail(); }, [loading, user]);

  async function fetchDetail(){
    try {
      const id = window.location.pathname.split('/').pop();
      const res = await fetch(`/api/dashboard/orders/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load');
      setData(json.order);
    } catch (e) { setError(e.message); }
  }

  if (loading || (!data && !error)) {
    return (
      <DashboardLayout user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout user={user}>
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <Link href="/dashboard/orders" className="text-cyan-600 hover:text-cyan-700">Back to Orders</Link>
        </div>
      </DashboardLayout>
    );
  }

  const o = data;

  return (
    <DashboardLayout user={user}>
      <div className="flex items-center justify-between mb-6">
        <Link href="/dashboard/orders" className="text-cyan-600 hover:text-cyan-700">← Back to Orders</Link>
        <StatusBadge status={o.status} />
      </div>

      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{o.order_number}</h1>
        <p className="text-gray-600">Placed on {formatDate(o.created_at)}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-600">Order Number</span><div className="font-medium text-gray-900">{o.order_number}</div></div>
              <div><span className="text-gray-600">Status</span><div className="font-medium text-gray-900">{String(o.status||'').split('_').map(w=>w[0]?.toUpperCase()+w.slice(1)).join(' ')}</div></div>
              <div><span className="text-gray-600">Payment Status</span><div className="font-medium text-gray-900">{String(o.payment_status||'').split('_').map(w=>w[0]?.toUpperCase()+w.slice(1)).join(' ')}</div></div>
              <div><span className="text-gray-600">Delivery Date</span><div className="font-medium text-gray-900">{o.delivery_date ? formatDate(o.delivery_date) : '—'}</div></div>
              <div><span className="text-gray-600">Estimated Completion</span><div className="font-medium text-gray-900">{o.estimated_completion_date ? formatDate(o.estimated_completion_date) : '—'}</div></div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents ({o.documents?.length || 0})</h3>
            {(!o.documents || o.documents.length === 0) ? (
              <div className="text-sm text-gray-600">No documents.</div>
            ) : (
              <div className="divide-y">
                {o.documents.map((d) => (
                  <div key={d.id} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium text-gray-900">{d.filename}</div>
                      <div className="text-gray-600">{bytes(d.bytes)} • {d.content_type || 'file'}</div>
                    </div>
                    {d.file_url || d.signed_url ? (
                      <a href={d.file_url || d.signed_url} target="_blank" rel="noreferrer" className="text-cyan-600 hover:text-cyan-700">Download</a>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {(o.billing_address || o.shipping_address) && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Addresses</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                {o.billing_address && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Billing Address</h4>
                    {formatAddress(o.billing_address)}
                  </div>
                )}
                {o.shipping_address && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Shipping Address</h4>
                    {formatAddress(o.shipping_address)}
                  </div>
                )}
              </div>
            </div>
          )}

          {o.quote && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quote Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-600">Quote Number</span><div className="font-medium text-gray-900">{o.quote.quote_number || String(o.quote.quote_id).slice(0,8)}</div></div>
                <div><span className="text-gray-600">Languages</span><div className="font-medium text-gray-900">{o.quote.source_lang} → {o.quote.target_lang}</div></div>
                <div><span className="text-gray-600">Intended Use</span><div className="font-medium text-gray-900">{o.quote.intended_use_name || o.quote.intended_use || '—'}</div></div>
                <div><span className="text-gray-600">Certification Type</span><div className="font-medium text-gray-900">{o.quote.cert_type_name || o.quote.cert_type_code || '—'}</div></div>
                <div><span className="text-gray-600">Country of Issue</span><div className="font-medium text-gray-900">{o.quote.country_of_issue || '—'}</div></div>
                <div><span className="text-gray-600">Delivery Option</span><div className="font-medium text-gray-900">{o.quote.delivery_option || '—'}</div></div>
                <div><span className="text-gray-600">Delivery Date</span><div className="font-medium text-gray-900">{o.quote.delivery_date ? formatDate(o.quote.delivery_date) : '—'}</div></div>
                <div><span className="text-gray-600">Quote Created</span><div className="font-medium text-gray-900">{o.quote.created_at ? formatDate(o.quote.created_at) : '—'}</div></div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Breakdown</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <Row label="Translation" value={currency(o.translation_total)} />
              <Row label="Certification" value={currency(o.certification_total)} />
              <Row label="Delivery" value={currency(o.delivery_total)} />
              {Number(o.shipping_total || 0) > 0 ? <Row label="Shipping" value={currency(o.shipping_total)} /> : null}
              <div className="border-t my-2"></div>
              <Row label="Subtotal" value={currency(o.subtotal)} />
              <Row label={`Tax (${Number(o.tax_rate || 0) * 100}%)`} value={currency(o.tax_total)} />
              <div className="border-t my-2"></div>
              <div className="flex items-center justify-between font-semibold text-gray-900">
                <div>Total</div>
                <div>{currency(o.total)}</div>
              </div>
              <div className="text-xs text-gray-500 mt-1">All prices in {o.currency || 'CAD'}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Timeline</h3>
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              <TimelineItem icon="📝" label="Order Created" date={o.created_at} />
              {o.paid_at ? <TimelineItem icon="💳" label="Payment Received" date={o.paid_at} /> : <TimelineItem icon="💳" label="Payment Received" />}
              {o.started_at ? <TimelineItem icon="⏳" label="Work Started" date={o.started_at} /> : <TimelineItem icon="⏳" label="Work Started" />}
              {o.completed_at ? <TimelineItem icon="✓" label="Completed" date={o.completed_at} /> : <TimelineItem icon="✓" label="Completed" />}
              {o.delivered_at ? <TimelineItem icon="📦" label="Delivered" date={o.delivered_at} /> : <TimelineItem icon="📦" label="Delivered" />}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Row({ label, value }){ return (
  <div className="flex items-center justify-between"><div>{label}</div><div>{value}</div></div>
); }

function TimelineItem({ icon, label, date }){
  const complete = !!date;
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${complete ? 'bg-cyan-500 text-white' : 'bg-gray-200 text-gray-500'}`}>{icon}</div>
      <div>
        <div className={`text-sm ${complete ? 'text-gray-900' : 'text-gray-500'}`}>{label}</div>
        <div className="text-xs text-gray-500">{date ? formatDateTime(date) : '—'}</div>
      </div>
    </div>
  );
}

function formatAddress(a){
  return (
    <div className="text-sm text-gray-700">
      <div className="font-medium text-gray-900">{a.full_name}</div>
      {a.company_name ? <div>{a.company_name}</div> : null}
      <div>{a.address_line1 || a.address_line_1}</div>
      {a.address_line2 ? <div>{a.address_line2}</div> : null}
      <div>{a.city}, {a.province_state || a.state_province} {a.postal_code}</div>
      <div>{a.country}</div>
      {a.phone ? <div className="text-gray-600 mt-1">{a.phone}</div> : null}
    </div>
  );
}
