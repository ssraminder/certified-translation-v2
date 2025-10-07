import { useState, useEffect } from 'react';

export default function FeedbackModal({ open, title, confirmText = 'Confirm', onConfirm, onCancel }){
  const [text, setText] = useState('');
  useEffect(()=>{ if (!open) setText(''); }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <p className="text-sm text-gray-600 mb-3">Please provide a reason:</p>
        <textarea value={text} onChange={(e)=> setText(e.target.value)} placeholder="Enter your reason..." className="w-full border border-gray-300 rounded p-2 h-24 text-sm" required />
        <div className="flex gap-2 mt-4">
          <button onClick={()=> text.trim() && onConfirm && onConfirm(text)} disabled={!text.trim()} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed">{confirmText}</button>
          <button onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}
