import { useState } from 'react';

const statusColorMap = {
  pending: 'bg-gray-100 text-gray-800',
  pending_payment: 'bg-gray-100 text-gray-800',
  processing: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  draft_review: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  amended: 'bg-orange-100 text-orange-800',
};

export default function PageHeader({ order }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTimeAgo = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days < 7) return `${days} days ago`;
    return formatDate(date);
  };

  const statuses = [];
  if (order.payment_status === 'paid') statuses.push('PAID');
  if (order.status === 'in_progress' || order.status === 'processing') statuses.push('IN PROGRESS');
  if (order.amendments_count > 0) statuses.push('AMENDED');

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="mx-auto max-w-5xl px-8">
        <div className="flex items-center justify-between py-4">
          {/* Left Side */}
          <div className="flex-1">
            <p className="text-sm text-gray-500 mb-1">
              Dashboard {'>'} Orders {'>'} Order #{order.order_number}
            </p>
            <h1 className="text-2xl font-bold text-gray-900">{order.order_number}</h1>
          </div>

          {/* Center - Status Badges */}
          <div className="flex gap-2 mx-8">
            {statuses.map((status) => (
              <span
                key={status}
                className={`inline-flex items-center rounded px-2 py-1 text-xs font-semibold uppercase ${
                  statusColorMap[status.toLowerCase()] || 'bg-gray-100 text-gray-800'
                }`}
              >
                {status}
              </span>
            ))}
          </div>

          {/* Right Side - Dates */}
          <div className="text-right">
            <p className="text-xs text-gray-500">
              Created: {formatDate(order.created_at)}
            </p>
            <p className="text-xs text-gray-500">
              Updated: {getTimeAgo(order.updated_at)}
            </p>
          </div>

          {/* Menu */}
          <div className="relative ml-6">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Order menu"
            >
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Print Order
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Download PDF
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Archive Order
                </button>
                <hr className="my-1" />
                <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                  Delete Order
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
