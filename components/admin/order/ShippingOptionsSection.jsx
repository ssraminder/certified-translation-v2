import { useMemo } from 'react';

export default function ShippingOptionsSection({ order }) {
  const shippingOptions = useMemo(() => {
    if (Array.isArray(order?.shipping_options) && order.shipping_options.length > 0) {
      return order.shipping_options;
    }
    return [];
  }, [order?.shipping_options]);

  const totalShippingPrice = useMemo(() => {
    return shippingOptions.reduce((sum, opt) => sum + (Number(opt.price) || 0), 0);
  }, [shippingOptions]);

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Shipping Options</h2>

      {shippingOptions.length > 0 ? (
        <div className="space-y-4">
          {shippingOptions.map((option, index) => (
            <div
              key={`${option.id || index}-${option.shipping_option_id || index}`}
              className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50"
            >
              <div className="flex items-center gap-3 mb-3">
                <svg
                  className="w-5 h-5 text-blue-600 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <h3 className="font-semibold text-gray-900">{option.name}</h3>
              </div>

              {option.description && (
                <p className="text-sm text-gray-700 mb-2">{option.description}</p>
              )}

              {option.delivery_time && (
                <p className="text-sm text-gray-600 mb-3">Delivery: {option.delivery_time}</p>
              )}

              {option.tracking_number && (
                <div className="bg-white rounded p-2 mb-3 text-sm">
                  <p className="text-gray-600">Tracking: {option.tracking_number}</p>
                  <button className="text-blue-600 hover:text-blue-700 font-medium text-xs mt-1">
                    Track Package
                  </button>
                </div>
              )}

              {option.estimated_delivery && (
                <p className="text-sm text-gray-600 mb-3">Est. Delivery: {option.estimated_delivery}</p>
              )}

              <p className="text-lg font-bold text-gray-900 mt-4">
                ${Number(option.price || 0).toFixed(2)}
              </p>
            </div>
          ))}

          {totalShippingPrice > 0 && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900">Total Shipping:</span>
                <span className="text-lg font-bold text-gray-900">${totalShippingPrice.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-gray-600 text-sm">
          <p>No shipping options selected for this order.</p>
        </div>
      )}
    </div>
  );
}
