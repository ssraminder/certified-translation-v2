import { useState, useEffect, useMemo } from 'react';

export default function DiscountModal({ open, onClose, onSubmit, subtotal = 0, title = 'Add Discount', confirmText = 'Add Discount', positive = false }){
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState('fixed');
  const [discountValue, setDiscountValue] = useState('');
  useEffect(()=>{ if (!open){ setDescription(''); setDiscountType('fixed'); setDiscountValue(''); } }, [open]);
  if (!open) return null;
  const computed = useMemo(()=>{
    const v = Number(discountValue || 0);
    if (discountType === 'percentage') return Math.max(0, subtotal * (v/100));
    return Math.max(0, v);
  }, [discountType, discountValue, subtotal]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded bg-white p-4">
        <h3 className="text-lg font-semibold mb-3">{title}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Description *</label>
            <input type="text" placeholder={positive ? 'e.g., Rush surcharge' : 'e.g., Bulk discount'} value={description} onChange={e=> setDescription(e.target.value)} className="w-full rounded border px-2 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type *</label>
            <select value={discountType} onChange={e=> setDiscountType(e.target.value)} className="w-full rounded border px-2 py-2">
              <option value="fixed">Fixed Amount ($)</option>
              <option value="percentage">Percentage (%)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Value *</label>
            <input type="number" step={discountType === 'percentage' ? '1' : '0.01'} min="0" max={discountType === 'percentage' ? '100' : undefined} placeholder={discountType === 'percentage' ? '0' : '0.00'} value={discountValue} onChange={e=> setDiscountValue(e.target.value)} className="w-full rounded border px-2 py-2" />
          </div>
          <div className="bg-gray-50 p-3 rounded text-sm">
            <p>
              Preview: {description || 'Description'}:
              {discountType === 'fixed' ? ` ${positive ? '+' : '-'}$${Number(discountValue||0).toFixed(2)}` : ` ${discountValue||0}%`}
              {' = '}
              {positive ? `+$${computed.toFixed(2)}` : `-$${computed.toFixed(2)}`}
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={()=> onSubmit && onSubmit({ description: description.trim(), discount_type: discountType, discount_value: Number(discountValue||0) })} disabled={!description.trim() || !(Number(discountValue) > 0)} className="rounded bg-cyan-600 px-3 py-2 text-white disabled:opacity-50">{confirmText}</button>
            <button onClick={onClose} className="rounded border px-3 py-2">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
