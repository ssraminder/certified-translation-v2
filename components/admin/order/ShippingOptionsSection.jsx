import { useState } from 'react';

export default function ShippingOptionsSection({ order }) {
  const [showChange, setShowChange] = useState(false);

  const selectedOption = order.shipping_option || {
    name: 'Scanned Copy',
    description: 'Digital delivery via email',
    delivery_time: 'Instant',
    price: 0,
  };

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Shipping Options</h2>

      <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <h3 className="font-semibold text-gray-900">{selectedOption.name}</h3>
        </div>

        <p className="text-sm text-gray-700 mb-2">{selectedOption.description}</p>
        <p className="text-sm text-gray-600 mb-3">Delivery: {selectedOption.delivery_time}</p>

        {selectedOption.tracking_number && (
          <div className="bg-white rounded p-2 mb-3 text-sm">
            <p className="text-gray-600">Tracking: {selectedOption.tracking_number}</p>
            <button className="text-blue-600 hover:text-blue-700 font-medium text-xs mt-1">
              Track Package
            </button>
          </div>
        )}

        {selectedOption.estimated_delivery && (
          <p className="text-sm text-gray-600">Est. Delivery: {selectedOption.estimated_delivery}</p>
        )}

        <p className="text-lg font-bold text-gray-900 mt-4">${selectedOption.price?.toFixed(2) || '0.00'}</p>
      </div>

      {!showChange && (
        <button
          onClick={() => setShowChange(true)}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
        >
          Change Shipping Method
        </button>
      )}

      {showChange && (
        <div className="space-y-3">
          <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
            <div className="flex items-start gap-3">
              <input type="radio" name="shipping" value="scanned" defaultChecked className="mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Scanned Copy</h4>
                <p className="text-sm text-gray-600">Digital delivery via email</p>
                <p className="text-sm text-gray-600">Instant</p>
                <p className="font-semibold text-gray-900 mt-1">$0.00</p>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
            <div className="flex items-start gap-3">
              <input type="radio" name="shipping" value="courier" className="mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Courier (Trackable)</h4>
                <p className="text-sm text-gray-600">2-3 business days</p>
                <p className="text-sm text-gray-600">Includes insurance</p>
                <p className="font-semibold text-gray-900 mt-1">$25.00</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowChange(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
              Update
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
