import { useEffect, useState, useMemo, useCallback } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { getServerSideAdminWithPermission } from '../../../lib/withAdminPage';
import OrderTimelineSection from '../../../components/admin/order/OrderTimelineSection';
import CustomerInformationSection from '../../../components/admin/order/CustomerInformationSection';
import ProjectDetailsWithLineItemsSection from '../../../components/admin/order/ProjectDetailsWithLineItemsSection';
import AnalysisResultsSection from '../../../components/admin/order/AnalysisResultsSection';
import DocumentsSection from '../../../components/admin/order/DocumentsSection';
import FilesDisplay from '../../../components/FilesDisplay';
import PricingFinancialsSection from '../../../components/admin/order/PricingFinancialsSection';
import BillingAddressSection from '../../../components/admin/order/BillingAddressSection';
import ShippingAddressSection from '../../../components/admin/order/ShippingAddressSection';
import ShippingOptionsSection from '../../../components/admin/order/ShippingOptionsSection';
import ActivityLogSection from '../../../components/admin/order/ActivityLogSection';
import ChatPanel from '../../../components/admin/order/ChatPanel';
import StickyActionBar from '../../../components/admin/order/StickyActionBar';
import PageHeader from '../../../components/admin/order/PageHeader';

export const getServerSideProps = getServerSideAdminWithPermission('orders', 'view');

export default function OrderDetailsPage({ initialAdmin }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

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

  const handleChatToggle = useCallback(() => {
    setChatOpen(v => !v);
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
    <AdminLayout title="" initialAdmin={initialAdmin}>
      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Sticky Header */}
        <PageHeader order={order} />

        {/* Main Content */}
        <div className="mx-auto max-w-5xl px-4 md:px-8 py-6 md:py-8 space-y-6">
          {/* Timeline */}
          <OrderTimelineSection order={order} />

          {/* Customer Information */}
          <CustomerInformationSection order={order} onUpdate={setOrder} />

          {/* Project Details with Line Items */}
          <ProjectDetailsWithLineItemsSection order={order} onUpdate={setOrder} />

          {/* Analysis Results */}
          {order.analysis_data && <AnalysisResultsSection data={order.analysis_data} />}

          {/* Documents */}
          <DocumentsSection order={order} onUpdate={setOrder} />

          {/* Files & Reference Materials */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Files Overview</h2>
            <FilesDisplay
              quoteFiles={order.documents || []}
              referenceFiles={order.reference_materials || []}
              context="order"
              isAdmin={true}
            />
          </div>

          {/* Pricing & Financials */}
          <PricingFinancialsSection order={order} onUpdate={setOrder} />

          {/* Billing Address */}
          <BillingAddressSection order={order} onUpdate={setOrder} />

          {/* Shipping Address */}
          <ShippingAddressSection order={order} onUpdate={setOrder} />

          {/* Shipping Options */}
          <ShippingOptionsSection order={order} />

          {/* Activity Log */}
          <ActivityLogSection orderId={order.id} />
        </div>

        {/* Sticky Action Bar */}
        <StickyActionBar order={order} onUpdate={setOrder} />

        {/* Chat Toggle Button */}
        <button
          onClick={handleChatToggle}
          className="fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center"
          aria-label="Open chat"
        >
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
          {unreadMessages > 0 && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-pulse">
              {unreadMessages}
            </div>
          )}
        </button>

        {/* Chat Panel */}
        <ChatPanel
          open={chatOpen}
          order={order}
          onClose={() => setChatOpen(false)}
          onUnreadChange={setUnreadMessages}
        />
      </div>
    </AdminLayout>
  );
}
