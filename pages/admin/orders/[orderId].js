import { useEffect, useState, useMemo } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { getServerSideAdminWithPermission } from '../../../lib/withAdminPage';

export const getServerSideProps = getServerSideAdminWithPermission('orders','view');

function round2(n) {
  const x = Number(n);
  return Math.round((Number.isFinite(x) ? x : 0) * 100) / 100;
}

function StatusBadge({ status }) {
  const color = useMemo(() => {
    const s = String(status || '').toLowerCase();
    if (s === 'pending' || s === 'pending_payment') return 'bg-gray-100 text-gray-800';
    if (s === 'processing') return 'bg-blue-100 text-blue-800';
    if (s === 'draft_review') return 'bg-yellow-100 text-yellow-800';
    if (s === 'certification') return 'bg-purple-100 text-purple-800';
    if (s === 'completed') return 'bg-green-100 text-green-800';
    if (s === 'cancelled') return 'bg-red-100 text-red-800';
    return 'bg-slate-100 text-slate-800';
  }, [status]);
  return <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${color}`}>{status || 'unknown'}</span>;
}

export default function OrderDetailsPage({ initialAdmin }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const orderId = window.location.pathname.split('/').pop();
    if (!orderId) {
      setError('Order ID not found');
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchOrder = async () => {
      try {
        const resp = await fetch(`/api/orders/${orderId}`);
        if (!resp.ok) {
          const json = await resp.json();
          throw new Error(json.error || 'Failed to load order');
        }
        const json = await resp.json();
        if (isMounted) {
          setOrder(json.order);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load order');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchOrder();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Order" initialAdmin={initialAdmin}>
        <div className="rounded-xl bg-white p-6">Loading...</div>
      </AdminLayout>
    );
  }

  if (error || !order) {
    return (
      <AdminLayout title="Order" initialAdmin={initialAdmin}>
        <div className="rounded-xl bg-white p-6">
          <p className="text-red-600">{error || 'Order not found'}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Order Details" initialAdmin={initialAdmin}>
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Order Details</h1>
          <p className="text-sm text-gray-600 mt-1">Order ID: {order?.id}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Header Card */}
            <div className="rounded-lg bg-white p-6 ring-1 ring-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Order Information</h2>
                <StatusBadge status={order.status} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Order Number</label>
                  <p className="text-lg font-medium text-gray-900">{order.order_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                  <p className="text-sm text-gray-900">{order.status}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Created Date</label>
                  <p className="text-sm text-gray-900">{order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Payment Status</label>
                  <p className="text-sm text-gray-900">{order.payment_status || '—'}</p>
                </div>
              </div>
            </div>

            {/* Customer Info Card */}
            <div className="rounded-lg bg-white p-6 ring-1 ring-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
                  <p className="text-sm text-gray-900">{order.customer_name || '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                  <p className="text-sm text-gray-900">{order.customer_email || '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                  <p className="text-sm text-gray-900">{order.customer_phone || '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Guest Order</label>
                  <p className="text-sm text-gray-900">{order.is_guest ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>

            {/* Billing Address */}
            {order.billing_address && (
              <div className="rounded-lg bg-white p-6 ring-1 ring-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing Address</h2>

                <div className="space-y-2 text-sm text-gray-900">
                  <p className="font-medium">{order.billing_address.full_name}</p>
                  <p>{order.billing_address.address_line1}</p>
                  {order.billing_address.address_line2 && <p>{order.billing_address.address_line2}</p>}
                  <p>{order.billing_address.city}, {order.billing_address.province_state} {order.billing_address.postal_code}</p>
                  <p>{order.billing_address.country}</p>
                  {order.billing_address.phone && <p className="text-gray-600">Phone: {order.billing_address.phone}</p>}
                  {order.billing_address.email && <p className="text-gray-600">Email: {order.billing_address.email}</p>}
                </div>
              </div>
            )}

            {/* Shipping Address */}
            {order.shipping_address && (
              <div className="rounded-lg bg-white p-6 ring-1 ring-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h2>

                <div className="space-y-2 text-sm text-gray-900">
                  <p className="font-medium">{order.shipping_address.full_name}</p>
                  <p>{order.shipping_address.address_line1}</p>
                  {order.shipping_address.address_line2 && <p>{order.shipping_address.address_line2}</p>}
                  <p>{order.shipping_address.city}, {order.shipping_address.province_state} {order.shipping_address.postal_code}</p>
                  <p>{order.shipping_address.country}</p>
                  {order.shipping_address.phone && <p className="text-gray-600">Phone: {order.shipping_address.phone}</p>}
                </div>
              </div>
            )}

            {/* Shipping Options */}
            {order.shipping_options && order.shipping_options.length > 0 && (
              <div className="rounded-lg bg-white p-6 ring-1 ring-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Options</h2>

                <div className="space-y-3">
                  {order.shipping_options.map(opt => (
                    <div key={opt.id} className="border rounded p-3 bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{opt.name}</h3>
                          {opt.description && <p className="text-sm text-gray-600 mt-1">{opt.description}</p>}
                          {opt.delivery_time && <p className="text-sm text-gray-600">Delivery: {opt.delivery_time}</p>}
                        </div>
                        <p className="font-medium text-gray-900">${round2(opt.price).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            {order.documents && order.documents.length > 0 && (
              <div className="rounded-lg bg-white p-6 ring-1 ring-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents</h2>

                <div className="space-y-3">
                  {order.documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded bg-gray-50 hover:bg-gray-100">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.filename}</p>
                          {doc.bytes && <p className="text-xs text-gray-500">{(doc.bytes / 1024).toFixed(0)} KB</p>}
                        </div>
                      </div>
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:text-blue-800">
                          Download
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <div className="rounded-lg bg-white p-6 ring-1 ring-gray-100 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Translation</span>
                    <span className="font-medium text-gray-900">${round2(order.translation_total).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Certification</span>
                    <span className="font-medium text-gray-900">${round2(order.certification_total).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery</span>
                    <span className="font-medium text-gray-900">${round2(order.delivery_total).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium text-gray-900">${round2(order.shipping_total).toFixed(2)}</span>
                  </div>

                  <div className="border-t pt-3 flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-900">${round2(order.subtotal).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax ({(order.tax_rate * 100).toFixed(0)}%)</span>
                    <span className="font-medium text-gray-900">${round2(order.tax_total).toFixed(2)}</span>
                  </div>

                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-lg font-semibold text-gray-900">${round2(order.total).toFixed(2)}</span>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2 text-sm">
                  <div>
                    <label className="block text-gray-600 mb-1">Currency</label>
                    <p className="font-medium text-gray-900">{order.currency}</p>
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Quote ID</label>
                    {order.quote_id ? (
                      <a href={`/admin/quotes/${order.quote_id}`} className="font-medium text-blue-600 hover:text-blue-800">
                        {order.quote_id}
                      </a>
                    ) : (
                      <p className="text-gray-500">—</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
