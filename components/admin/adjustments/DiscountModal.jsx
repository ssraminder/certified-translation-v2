import { useState, useEffect, useMemo } from 'react';

export default function DiscountModal({ open, onClose, onSubmit, subtotal = 0, title = 'Add Discount', confirmText = 'Add Discount', positive = false }){
  if (!open) return null;

  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(()=>{
    if (!open){
      setDescription('');
      setDiscountType('percentage');
      setDiscountValue('');
      setReason('');
      setSubmitting(false);
    }
  }, [open]);

  const computed = useMemo(()=>{
    const v = Number(discountValue || 0);
    if (discountType === 'percentage') return Math.max(0, subtotal * (v/100));
    return Math.max(0, v);
  }, [discountType, discountValue, subtotal]);

  const handleSubmit = async () => {
    if (onSubmit && !submitting) {
      setSubmitting(true);
      try {
        await onSubmit({
          description: description.trim(),
          discount_type: discountType,
          discount_value: Number(discountValue || 0),
          notes: reason.trim() || null
        });
      } catch (error) {
        console.error('Error submitting discount:', error);
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl relative">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded hover:bg-gray-100 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 17 16">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M12.5 4L4.5 12M4.5 4l8 8"/>
          </svg>
        </button>

        {/* Title */}
        <h2 className="text-lg font-semibold mb-6" style={{ letterSpacing: '-0.439px' }}>
          {title}
        </h2>

        {/* Form fields */}
        <div className="space-y-4">
          {/* Description */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Description *</label>
            <input 
              type="text" 
              placeholder={positive ? 'e.g., Rush processing fee' : 'e.g., Bulk order discount'} 
              value={description} 
              onChange={e=> setDescription(e.target.value)}
              className="w-full rounded-lg bg-gray-100 border-0 px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          {/* Type - Radio Buttons */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">Type *</label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setDiscountType('percentage')}
                  className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
                >
                  {discountType === 'percentage' && (
                    <svg className="w-2 h-2" viewBox="0 0 9 8" fill="none">
                      <g clipPath="url(#clip0_6_2303)">
                        <path d="M4.50008 7.33341C6.34103 7.33341 7.83341 5.84103 7.83341 4.00008C7.83341 2.15913 6.34103 0.666748 4.50008 0.666748C2.65913 0.666748 1.16675 2.15913 1.16675 4.00008C1.16675 5.84103 2.65913 7.33341 4.50008 7.33341Z" fill="#030213" stroke="#030213" strokeWidth="0.666667" strokeLinecap="round" strokeLinejoin="round"/>
                      </g>
                      <defs>
                        <clipPath id="clip0_6_2303">
                          <rect width="8" height="8" fill="white" transform="translate(0.5)"/>
                        </clipPath>
                      </defs>
                    </svg>
                  )}
                </button>
                <span className="text-sm font-medium">Percentage</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setDiscountType('fixed')}
                  className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
                >
                  {discountType === 'fixed' && (
                    <svg className="w-2 h-2" viewBox="0 0 9 8" fill="none">
                      <g clipPath="url(#clip0_6_2303)">
                        <path d="M4.50008 7.33341C6.34103 7.33341 7.83341 5.84103 7.83341 4.00008C7.83341 2.15913 6.34103 0.666748 4.50008 0.666748C2.65913 0.666748 1.16675 2.15913 1.16675 4.00008C1.16675 5.84103 2.65913 7.33341 4.50008 7.33341Z" fill="#030213" stroke="#030213" strokeWidth="0.666667" strokeLinecap="round" strokeLinejoin="round"/>
                      </g>
                      <defs>
                        <clipPath id="clip0_6_2303">
                          <rect width="8" height="8" fill="white" transform="translate(0.5)"/>
                        </clipPath>
                      </defs>
                    </svg>
                  )}
                </button>
                <span className="text-sm font-medium">Fixed Amount</span>
              </label>
            </div>
          </div>

          {/* Value */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Value *</label>
            <div className="relative">
              {discountType === 'fixed' && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">$</span>
              )}
              <input 
                type="number" 
                step={discountType === 'percentage' ? '1' : '0.01'} 
                min="0" 
                max={discountType === 'percentage' ? '100' : undefined}
                placeholder={discountType === 'percentage' ? '0' : '0.00'} 
                value={discountValue} 
                onChange={e=> setDiscountValue(e.target.value)}
                className={`w-full rounded-lg bg-gray-100 border-0 ${discountType === 'fixed' ? 'pl-8' : 'pl-3'} ${discountType === 'percentage' ? 'pr-8' : 'pr-3'} py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300`}
              />
              {discountType === 'percentage' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">%</span>
              )}
            </div>
          </div>

          {/* Reason (Optional) - for surcharges */}
          {positive && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Reason (Optional)</label>
              <textarea 
                placeholder="Enter reason for surcharge..." 
                value={reason} 
                onChange={e=> setReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg bg-gray-100 border-0 px-3 py-2 text-sm placeholder:text-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
          )}

          {/* Current Subtotal */}
          <div className="bg-gray-50 rounded px-3 py-3">
            <p className="text-sm text-gray-600">
              Current Subtotal: ${subtotal.toFixed(2)}
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200" />

          {/* Preview */}
          <div className={`rounded px-3 py-3 ${positive ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
            <p className={`text-base font-medium ${positive ? 'text-orange-900' : 'text-green-800'}`}>
              Preview: {positive ? 'Surcharge' : 'Discount'}: {positive ? '+' : '-'}${computed.toFixed(2)}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!description.trim() || !(Number(discountValue) > 0) || submitting}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
            >
              {submitting ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
