import { useState } from 'react';
import { formatForDisplay, toE164 } from '../../../lib/formatters/phone';

export default function CustomerInformationSection({ order, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: order.customer_name || '',
    customer_email: order.customer_email || '',
    customer_phone: order.customer_phone || '',
  });
  const [saving, setSaving] = useState(false);

  const customerType = order.customer_type || (order.is_guest ? 'guest' : 'individual');
  const isBusiness = customerType === 'business';

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
      setIsEditing(false);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const displayPhone = formData.customer_phone ? formatForDisplay(toE164(formData.customer_phone, 'CA') || formData.customer_phone) : '—';

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Customer Information</h2>
        <button
          onClick={() => {
            if (isEditing) {
              setFormData({
                customer_name: order.customer_name || '',
                customer_email: order.customer_email || '',
                customer_phone: order.customer_phone || '',
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-xs uppercase text-gray-500 font-medium mb-2">
              Full Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.customer_name}
                onChange={(e) => handleChange('customer_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter customer name"
              />
            ) : (
              <p className="text-gray-900 font-medium">{formData.customer_name || '—'}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs uppercase text-gray-500 font-medium mb-2">
              Email Address
            </label>
            {isEditing ? (
              <input
                type="email"
                value={formData.customer_email}
                onChange={(e) => handleChange('customer_email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-gray-900">{formData.customer_email || '—'}</p>
                {formData.customer_email && !order.is_guest && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Verified
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs uppercase text-gray-500 font-medium mb-2">
              Phone Number
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={formData.customer_phone}
                onChange={(e) => handleChange('customer_phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900">{displayPhone}</p>
            )}
          </div>

          {/* Customer ID */}
          <div>
            <label className="block text-xs uppercase text-gray-500 font-medium mb-2">
              Customer ID
            </label>
            <div className="flex items-center gap-2">
              <p className="text-gray-900 font-mono text-sm">{order.customer_id || order.user_id || '—'}</p>
              {(order.customer_id || order.user_id) && (
                <button
                  onClick={() => {
                    const id = order.customer_id || order.user_id;
                    navigator.clipboard.writeText(id);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  title="Copy to clipboard"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Customer Type Badge */}
          <div>
            <label className="block text-xs uppercase text-gray-500 font-medium mb-2">
              Customer Type
            </label>
            <div className="flex gap-2 flex-wrap">
              <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                isBusiness 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {isBusiness ? '🏢 Business' : '👤 Individual'}
              </span>
              {order.is_guest && (
                <span className="inline-block px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">
                  Guest User
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Business Info or Stats */}
        <div>
          {isBusiness && order.company_name ? (
            <div className="space-y-6">
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h3 className="text-sm font-semibold text-purple-900 mb-4">Business Information</h3>
                <div className="space-y-3">
                  {/* Company Name */}
                  <div>
                    <p className="text-xs text-purple-700 font-medium uppercase">Company Name</p>
                    <p className="text-sm text-purple-900 font-medium mt-1">{order.company_name}</p>
                  </div>

                  {/* Company Registration */}
                  {order.company_registration && (
                    <div>
                      <p className="text-xs text-purple-700 font-medium uppercase">Registration Number</p>
                      <p className="text-sm text-purple-900 font-mono mt-1">{order.company_registration}</p>
                    </div>
                  )}

                  {/* Business License */}
                  {order.business_license && (
                    <div>
                      <p className="text-xs text-purple-700 font-medium uppercase">Business License</p>
                      <p className="text-sm text-purple-900 font-mono mt-1">{order.business_license}</p>
                    </div>
                  )}

                  {/* Designation */}
                  {order.designation && (
                    <div>
                      <p className="text-xs text-purple-700 font-medium uppercase">Designation</p>
                      <p className="text-sm text-purple-900 mt-1">{order.designation}</p>
                    </div>
                  )}

                  {/* Tax ID */}
                  {order.tax_id && (
                    <div>
                      <p className="text-xs text-purple-700 font-medium uppercase">Tax ID</p>
                      <p className="text-sm text-purple-900 font-mono mt-1">{order.tax_id}</p>
                    </div>
                  )}

                  {!order.company_registration && !order.business_license && !order.designation && !order.tax_id && (
                    <p className="text-xs text-purple-600 italic">No additional business details available</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Customer Profile</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex justify-between items-center">
                  <span>Account Status</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    order.is_guest 
                      ? 'bg-gray-100 text-gray-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {order.is_guest ? 'Guest' : 'Registered'}
                  </span>
                </div>
                {order.created_at && (
                  <div className="flex justify-between items-center">
                    <span>Created</span>
                    <span className="text-gray-700">{new Date(order.created_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Bar */}
      {isEditing && (
        <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between bg-blue-50 -m-6 px-6 py-3 rounded-b-lg">
          <p className="text-sm text-blue-900">You have unsaved changes</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setFormData({
                  customer_name: order.customer_name || '',
                  customer_email: order.customer_email || '',
                  customer_phone: order.customer_phone || '',
                });
                setIsEditing(false);
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
