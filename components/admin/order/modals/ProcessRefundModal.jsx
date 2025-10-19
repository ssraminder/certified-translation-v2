import { useState } from 'react';

const refundReasons = [
  'Service downgrade',
  'Customer request',
  'Cancellation',
  'Quality issue',
  'Other',
];

export default function ProcessRefundModal({ open, order, refundAmount, onClose, onUpdate }) {
  const [amount, setAmount] = useState(refundAmount);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [processing, setProcessing] = useState(false);

  const handleProcess = async () => {
    if (!reason) {
      alert('Please select a reason');
      return;
    }

    setProcessing(true);
    try {
      const resp = await fetch(`/api/orders/${order.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          reason,
          notes,
          notifyCustomer,
        }),
      });

      if (!resp.ok) throw new Error('Failed to process refund');
      const data = await resp.json();
      onUpdate(data.order);
      onClose();
      alert('Refund processed successfully');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-lg shadow-xl">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2m6.364-2.636l-1.414-1.414m2.122-2.122l1.414-1.414M9.172 9.172L7.758 7.758m2.122-2.122L7.758 7.758" />
            </svg>
            <h3 className="text-2xl font-bold text-gray-900">Process Refund</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Refund Amount (Max: ${refundAmount.toFixed(2)})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Math.min(parseFloat(e.target.value), refundAmount))}
                max={refundAmount}
                step="0.01"
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Refund To */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Refund To</label>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">Original payment method</p>
              <p className="font-medium text-gray-900">
                {order.payment_method || 'Visa ••••4242'}
              </p>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a reason</option>
              {refundReasons.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Additional Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this refund..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows="3"
            />
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
            <p className="font-medium text-yellow-900 mb-1">⚠️ Warning</p>
            <p className="text-yellow-800">
              This will immediately refund ${amount.toFixed(2)} to the customer. This action cannot be undone.
            </p>
          </div>

          {/* Notify */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyCustomer}
              onChange={(e) => setNotifyCustomer(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Notify customer via email</span>
          </label>
        </div>

        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleProcess}
            disabled={processing || !reason}
            className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : 'Confirm Refund'}
          </button>
        </div>
      </div>
    </div>
  );
}
