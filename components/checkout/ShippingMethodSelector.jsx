export default function ShippingMethodSelector({ 
  options = [], 
  selectedId, 
  onSelect,
  requiresAddress = false
}) {
  const alwaysSelected = options.filter(o => o.is_always_selected);
  const optional = options.filter(o => !o.is_always_selected);

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Shipping Method</h2>
      <p className="text-xs text-gray-500 mb-6">Choose how you'd like to receive your documents</p>

      <div className="space-y-3">
        {/* Always selected options (usually free/default) */}
        {alwaysSelected.map((option) => (
          <div key={option.id} className="flex items-start gap-4 rounded-xl border-2 border-blue-400 bg-blue-50 p-4">
            <input
              type="checkbox"
              checked
              disabled
              className="h-5 w-5 mt-0.5 cursor-not-allowed"
            />
            <div className="flex-1">
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold text-gray-900">{option.name}</h3>
                <span className="text-sm font-semibold text-gray-900">FREE</span>
              </div>
              {option.description && <p className="text-sm text-gray-600 mt-1">{option.description}</p>}
              {option.delivery_time && <p className="text-xs text-gray-500 mt-1">Delivery: {option.delivery_time}</p>}
            </div>
          </div>
        ))}

        {/* Optional shipping methods */}
        {optional.length > 0 && (
          <>
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-700 font-medium mb-4">Choose additional delivery method (optional):</p>

              <div className="space-y-3">
                {optional.map((option) => {
                  const isDisabled = !option.is_active;
                  const isChecked = String(selectedId) === String(option.id);

                  return (
                    <label
                      key={option.id}
                      className={`flex items-start gap-4 rounded-xl border p-4 transition ${
                        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        isChecked ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="shipping_method"
                        checked={isChecked}
                        disabled={isDisabled}
                        onChange={() => !isDisabled && onSelect(String(option.id))}
                        className="h-5 w-5 mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between">
                          <h3 className={`font-semibold ${isDisabled ? 'text-gray-500' : 'text-gray-900'}`}>
                            {option.name}
                            {isDisabled && <span className="text-xs text-red-600 ml-2">(Unavailable)</span>}
                          </h3>
                          <span className="text-sm font-semibold text-gray-900 ml-4">
                            {Number(option.price || 0) > 0 ? `$${Number(option.price).toFixed(2)}` : 'FREE'}
                          </span>
                        </div>
                        {option.description && <p className="text-sm text-gray-600 mt-1">{option.description}</p>}
                        {option.delivery_time && <p className="text-xs text-gray-500 mt-1">Delivery: {option.delivery_time}</p>}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
