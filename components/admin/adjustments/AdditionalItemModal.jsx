import { useState, useEffect } from 'react';

export default function AdditionalItemModal({ open, onClose, onSubmit }){
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  
  useEffect(()=>{ 
    if (!open){ 
      setDescription(''); 
      setAmount(''); 
      setNotes('');
    } 
  }, [open]);
  
  if (!open) return null;

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit({ 
        description: description.trim(), 
        amount: Number(amount || 0),
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
          Add Additional Item
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
              placeholder="Enter item description" 
              value={description} 
              onChange={e=> setDescription(e.target.value)}
              className="w-full rounded-lg bg-gray-100 border-0 px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">$</span>
              <input 
                type="number" 
                step="0.01" 
                min="0" 
                placeholder="0.00" 
                value={amount} 
                onChange={e=> setAmount(e.target.value)}
                className="w-full rounded-lg bg-gray-100 border-0 pl-8 pr-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
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
              disabled={!description.trim() || !(Number(amount) > 0)}
              className="px-4 py-2 rounded-lg bg-black text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-900 transition-colors"
            >
              Add Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
