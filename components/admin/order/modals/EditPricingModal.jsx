import { useState } from 'react';

export default function EditPricingModal({ open, order, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    translation_total: order.translation_total || 0,
    certification_total: order.certification_total || 0,
    delivery_total: order.delivery_total || 0,
    shipping_total: order.shipping_total || 0,
    discount_amount: order.discount_amount || 0,
    discount_type: order.discount_type || 'fixed',
    discount_reason: order.discount_reason || '',
  });
  const [saving, setSaving] = useState(false);

  const subtotal =
    parseFloat(formData.translation_total) +
    parseFloat(formData.certification_total) +
    parseFloat(formData.delivery_total) +
    parseFloat(formData.shipping_total);

  const discountAmount = formData.discount_type === 'percentage'
    ? (subtotal * parseFloat(formData.discount_amount || 0)) / 100
    : parseFloat(formData.discount_amount || 0);

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const tax = afterDiscount * (order.tax_rate || 0.05);
  const newTotal = afterDiscount + tax;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const resp = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!resp.ok) throw new Error('Failed to update');
      const data = await resp.json();
      onUpdate(data.order);
      onClose();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-lg shadow-xl">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-gray-900">Edit Pricing</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Items */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Order Items</h4>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-600 font-medium">Item</th>
                  <th className="text-right py-2 text-gray-600 font-medium">Price</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-3">Translation</td>
                  <td className="text-right">
                    <input
                      type="number"
                      value={formData.translation_total}
                      onChange={(e) => handleChange('translation_total', e.target.value)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                    />
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-3">Certification</td>
                  <td className="text-right">
                    <input
                      type="number"
                      value={formData.certification_total}
                      onChange={(e) => handleChange('certification_total', e.target.value)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                    />
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-3">Delivery</td>
                  <td className="text-right">
                    <input
                      type="number"
                      value={formData.delivery_total}
                      onChange={(e) => handleChange('delivery_total', e.target.value)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="py-3">Shipping</td>
                  <td className="text-right">
                    <input
                      type="number"
                      value={formData.shipping_total}
                      onChange={(e) => handleChange('shipping_total', e.target.value)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Discount */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Discount</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="discount_type"
                    value="fixed"
                    checked={formData.discount_type === 'fixed'}
                    onChange={(e) => handleChange('discount_type', e.target.value)}
                  />
                  <span className="text-sm text-gray-700">Fixed Amount</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="discount_type"
                    value="percentage"
                    checked={formData.discount_type === 'percentage'}
                    onChange={(e) => handleChange('discount_type', e.target.value)}
                  />
                  <span className="text-sm text-gray-700">Percentage</span>
                </label>
              </div>
              <div>
                <input
                  type="number"
                  value={formData.discount_amount}
                  onChange={(e) => handleChange('discount_amount', e.target.value)}
                  placeholder={formData.discount_type === 'percentage' ? '10%' : '$10'}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Reason (required)</label>
                <textarea
                  value={formData.discount_reason}
                  onChange={(e) => handleChange('discount_reason', e.target.value)}
                  placeholder="Why is this discount being applied?"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows="2"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount</span>
                <span className="font-medium">-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">After Discount</span>
              <span className="font-medium text-gray-900">${afterDiscount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax ({((order.tax_rate || 0.05) * 100).toFixed(0)}%)</span>
              <span className="font-medium text-gray-900">${tax.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-base">
              <span className="text-gray-900">New Total</span>
              <span className="text-gray-900">${newTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
            Customer will be notified of pricing changes.
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
            onClick={handleSave}
            disabled={saving || !formData.discount_reason}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Update Pricing'}
          </button>
        </div>
      </div>
    </div>
  );
}
