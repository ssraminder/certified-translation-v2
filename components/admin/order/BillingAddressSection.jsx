import { useState } from 'react';

export default function BillingAddressSection({ order, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: order.billing_address?.full_name || '',
    address_line1: order.billing_address?.address_line1 || '',
    address_line2: order.billing_address?.address_line2 || '',
    city: order.billing_address?.city || '',
    province_state: order.billing_address?.province_state || '',
    postal_code: order.billing_address?.postal_code || '',
    country: order.billing_address?.country || '',
    phone: order.billing_address?.phone || '',
    email: order.billing_address?.email || '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const resp = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billing_address: formData }),
      });
      if (!resp.ok) throw new Error('Failed to update');
      const data = await resp.json();
      onUpdate(data.order);
      setIsEditing(false);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Billing Address</h2>
        <button
          onClick={() => {
            if (isEditing) {
              setFormData({
                full_name: order.billing_address?.full_name || '',
                address_line1: order.billing_address?.address_line1 || '',
                address_line2: order.billing_address?.address_line2 || '',
                city: order.billing_address?.city || '',
                province_state: order.billing_address?.province_state || '',
                postal_code: order.billing_address?.postal_code || '',
                country: order.billing_address?.country || '',
                phone: order.billing_address?.phone || '',
                email: order.billing_address?.email || '',
              });
              setIsEditing(false);
            } else {
              setIsEditing(true);
            }
          }}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs uppercase text-gray-500 font-medium mb-2">Full Name</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs uppercase text-gray-500 font-medium mb-2">Address Line 1</label>
            <input
              type="text"
              value={formData.address_line1}
              onChange={(e) => handleChange('address_line1', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs uppercase text-gray-500 font-medium mb-2">Address Line 2</label>
            <input
              type="text"
              value={formData.address_line2}
              onChange={(e) => handleChange('address_line2', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase text-gray-500 font-medium mb-2">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs uppercase text-gray-500 font-medium mb-2">Province/State</label>
              <input
                type="text"
                value={formData.province_state}
                onChange={(e) => handleChange('province_state', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase text-gray-500 font-medium mb-2">Postal Code</label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => handleChange('postal_code', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs uppercase text-gray-500 font-medium mb-2">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase text-gray-500 font-medium mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs uppercase text-gray-500 font-medium mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Address'}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-gray-900 space-y-1 text-sm">
          <p className="font-medium">{formData.full_name}</p>
          <p>{formData.address_line1}</p>
          {formData.address_line2 && <p>{formData.address_line2}</p>}
          <p>
            {formData.city}, {formData.province_state} {formData.postal_code}
          </p>
          <p>{formData.country}</p>
          {formData.phone && <p className="text-gray-600">Phone: {formData.phone}</p>}
          {formData.email && <p className="text-gray-600">Email: {formData.email}</p>}
        </div>
      )}
    </div>
  );
}
