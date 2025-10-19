import { useMemo } from 'react';

function classNames(...v) {
  return v.filter(Boolean).join(' ');
}

function formatCurrency(v) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(Number(v || 0));
}

export default function ShippingMethodSection({ options = [], selected = new Set(), onToggle }) {
  const scannedCopy = useMemo(() => options.find(o => o.is_always_selected), [options]);
  const additionalOptions = useMemo(() => options.filter(o => !o.is_always_selected), [options]);

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Shipping Method</h2>
      <p className="text-xs text-gray-500 mb-6">Choose how you'd like to receive your documents</p>

      <div className="space-y-3">
        {scannedCopy && (
          <div className="flex items-start gap-4 rounded-xl border-2 border-blue-400 bg-blue-50 p-4">
            <input
              type="checkbox"
              checked
              disabled
              className="h-5 w-5 mt-0.5 cursor-not-allowed"
            />
            <div className="flex-1">
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold text-gray-900">Scanned Copy</h3>
                <span className="text-sm font-semibold text-gray-900">FREE</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">Digital delivery via email</p>
              <p className="text-xs text-gray-500 mt-1">Delivery: Instant upon completion</p>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-700 font-medium mb-4">Choose additional delivery method (optional):</p>

          <div className="space-y-3">
            {additionalOptions.map(option => {
              const isChecked = selected.has(option.id);
              const isDisabled = !option.is_active;

              return (
                <label
                  key={option.id}
                  className={classNames(
                    'flex items-start gap-4 rounded-xl border p-4 transition cursor-pointer',
                    isDisabled ? 'opacity-50 cursor-not-allowed' : '',
                    isChecked ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  <input
                    type="radio"
                    name="physical_delivery"
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={() => {
                      if (!isDisabled) {
                        onToggle(option.id);
                      }
                    }}
                    className="h-5 w-5 mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <h3 className={classNames('font-semibold', isDisabled ? 'text-gray-500' : 'text-gray-900')}>
                        {option.name}
                        {isDisabled && <span className="text-xs text-red-600 ml-2">(Unavailable)</span>}
                      </h3>
                      <span className="text-sm font-semibold text-gray-900 ml-4">
                        {Number(option.price || 0) > 0 ? formatCurrency(option.price) : 'FREE'}
                      </span>
                    </div>
                    {option.description && (
                      <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                    )}
                    {option.delivery_time && (
                      <p className="text-xs text-gray-500 mt-1">Delivery: {option.delivery_time}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
