import { useState, useEffect } from 'react';

export default function AdditionalItemModal({ open, onClose, onSubmit }){
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  useEffect(()=>{ if (!open){ setDescription(''); setAmount(''); } }, [open]);
  if (!open) return null;
  const previewAmount = Number.parseFloat(amount || 0).toFixed(2);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded bg-white p-4">
        <h3 className="text-lg font-semibold mb-3">Add Additional Item</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Description *</label>
            <input type="text" placeholder="e.g., Rush fee, Handling fee" value={description} onChange={e=> setDescription(e.target.value)} className="w-full rounded border px-2 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount *</label>
            <input type="number" step="0.01" min="0" placeholder="0.00" value={amount} onChange={e=> setAmount(e.target.value)} className="w-full rounded border px-2 py-2" />
          </div>
          <div className="bg-gray-50 p-3 rounded text-sm">Preview: {description || 'Description'}: ${previewAmount}</div>
          <div className="flex gap-2 pt-2">
            <button onClick={()=> onSubmit && onSubmit({ description: description.trim(), amount: Number(amount||0) })} disabled={!description.trim() || !(Number(amount) > 0)} className="rounded bg-cyan-600 px-3 py-2 text-white disabled:opacity-50">Add Item</button>
            <button onClick={onClose} className="rounded border px-3 py-2">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
