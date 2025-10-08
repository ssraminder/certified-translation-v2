import { useState, useEffect, useMemo } from 'react';

export default function DiscountModal({ open, onClose, onSubmit, subtotal = 0, title = 'Add Discount', confirmText = 'Add Discount', positive = false }){
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState('fixed');
  const [discountValue, setDiscountValue] = useState('');
  const [notes, setNotes] = useState('');
  
  useEffect(()=>{ 
    if (!open){ 
      setDescription(''); 
      setDiscountType('fixed'); 
      setDiscountValue(''); 
      setNotes('');
    } 
  }, [open]);
  
  if (!open) return null;
  
  const computed = useMemo(()=>{
    const v = Number(discountValue || 0);
    if (discountType === 'percentage') return Math.max(0, subtotal * (v/100));
    return Math.max(0, v);
  }, [discountType, discountValue, subtotal]);

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit({ 
        description: description.trim(), 
        discount_type: discountType, 
        discount_value: Number(discountValue || 0),
        notes: notes.trim() || null
      });
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
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 17 17">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M12.5 4.5L4.5 12.5M4.5 4.5l8 8"/>
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
            <label className="text-sm font-medium">
              Description <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              placeholder={positive ? 'e.g., Rush surcharge' : 'e.g., Bulk discount'} 
              value={description} 
              onChange={e=> setDescription(e.target.value)}
              className="w-full rounded-lg bg-gray-100 border-0 px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          {/* Type */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Type <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select 
                value={discountType} 
                onChange={e=> setDiscountType(e.target.value)}
                className="w-full rounded-lg bg-gray-100 border-0 px-3 py-2 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                <option value="fixed">Fixed Amount ($)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M4 6l4 4 4-4"/>
              </svg>
            </div>
          </div>

          {/* Value */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Value <span className="text-red-500">*</span>
            </label>
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
                className={`w-full rounded-lg bg-gray-100 border-0 ${discountType === 'fixed' ? 'pl-8' : 'pl-3'} pr-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300`}
              />
              {discountType === 'percentage' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">%</span>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <p className="text-blue-900">
              <span className="font-medium">Preview:</span> {description || 'Description'}
              {discountType === 'fixed' ? ` ${positive ? '+' : '-'}$${Number(discountValue||0).toFixed(2)}` : ` ${discountValue||0}%`}
              {' = '}
              <span className="font-medium">{positive ? `+$${computed.toFixed(2)}` : `-$${computed.toFixed(2)}`}</span>
            </p>
          </div>

          {/* Notes (Optional) */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Notes (Optional)</label>
            <textarea 
              placeholder="Enter any additional notes..." 
              value={notes} 
              onChange={e=> setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg bg-gray-100 border-0 px-3 py-2 text-sm placeholder:text-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={!description.trim() || !(Number(discountValue) > 0)}
              className="px-4 py-2 rounded-lg bg-black text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-900 transition-colors"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
