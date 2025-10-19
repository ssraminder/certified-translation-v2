import { useState } from 'react';

export default function SendInvoiceModal({ open, order, balance, onClose, onUpdate }) {
  const [scheduleMode, setScheduleMode] = useState('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [includePaymentLink, setIncludePaymentLink] = useState(true);
  const [sendCopyToAdmin, setSendCopyToAdmin] = useState(true);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!order.customer_email) {
      alert('Customer email not found');
      return;
    }

    setSending(true);
    try {
      const resp = await fetch(`/api/orders/${order.id}/send-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: balance,
          scheduleMode,
          scheduledDate: scheduleMode === 'scheduled' ? scheduledDate : null,
          includePaymentLink,
          sendCopyToAdmin,
        }),
      });

      if (!resp.ok) throw new Error('Failed to send invoice');
      const data = await resp.json();
      onUpdate(data.order);
      onClose();
      alert('Invoice sent successfully');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-lg shadow-xl">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-gray-900">Send Invoice</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Amount */}
          <div>
            <p className="text-sm text-gray-600 mb-2">Amount Due</p>
            <p className="text-4xl font-bold text-gray-900">${balance.toFixed(2)}</p>
          </div>

          {/* To */}
          <div>
            <p className="text-sm text-gray-600 mb-1">Send To</p>
            <p className="font-medium text-gray-900">{order.customer_email}</p>
          </div>

          {/* Schedule */}
          <div>
            <p className="text-sm font-medium text-gray-900 mb-3">Timing</p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="schedule"
                  value="now"
                  checked={scheduleMode === 'now'}
                  onChange={(e) => setScheduleMode(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Send now</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="schedule"
                  value="scheduled"
                  checked={scheduleMode === 'scheduled'}
                  onChange={(e) => setScheduleMode(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Schedule for later</span>
              </label>
            </div>

            {scheduleMode === 'scheduled' && (
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          {/* Options */}
          <div className="space-y-3 bg-gray-50 rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includePaymentLink}
                onChange={(e) => setIncludePaymentLink(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Include secure payment link</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sendCopyToAdmin}
                onChange={(e) => setSendCopyToAdmin(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Send copy to me</span>
            </label>
          </div>

          {/* Email Preview */}
          <div className="border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto text-sm">
            <p className="font-medium text-gray-900 mb-2">Email Preview</p>
            <div className="text-xs text-gray-600 space-y-2">
              <p><strong>To:</strong> {order.customer_email}</p>
              <p><strong>Subject:</strong> Invoice - Order {order.order_number}</p>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <p>Dear {order.customer_name || 'Customer'},</p>
                <p className="mt-2">Please find your invoice attached. The amount due is:</p>
                <p className="font-bold mt-2">${balance.toFixed(2)}</p>
                {includePaymentLink && (
                  <p className="mt-2">You can pay securely using the link below.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || (scheduleMode === 'scheduled' && !scheduledDate)}
            className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}
