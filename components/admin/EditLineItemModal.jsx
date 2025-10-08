import { useEffect, useMemo, useState } from 'react';

export default function EditLineItemModal({ open, onClose, lineItem, onSave }){
  const [billablePages, setBillablePages] = useState('');
  const [unitRateOverride, setUnitRateOverride] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const pages = lineItem?.billable_pages ?? '';
    const rate = (lineItem?.unit_rate_override ?? '') === ''
      ? ''
      : String(lineItem?.unit_rate_override);
    setBillablePages(pages === null ? '' : String(pages));
    setUnitRateOverride(rate);
    setOverrideReason(lineItem?.override_reason || '');
  }, [open, lineItem]);

  const effectiveRate = useMemo(() => {
    const raw = unitRateOverride === '' ? (lineItem?.unit_rate ?? 0) : Number(unitRateOverride) || 0;
    return Number(raw || 0);
  }, [unitRateOverride, lineItem]);

  const total = useMemo(() => {
    const pages = Number(billablePages) || 0;
    return (pages * effectiveRate).toFixed(2);
  }, [billablePages, effectiveRate]);

  async function submit(e){
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const patch = {
        billable_pages: billablePages === '' ? null : Number(billablePages),
        unit_rate_override: unitRateOverride === '' ? null : Number(unitRateOverride),
        override_reason: overrideReason || null,
      };
      await onSave?.(patch);
      onClose?.();
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg border bg-white shadow-lg">
        <div className="flex items-center justify-between px-6 py-5 border-b">
          <h2 className="text-lg font-semibold">Edit Line Item</h2>
          <button onClick={onClose} type="button" className="p-1 rounded hover:bg-gray-100 opacity-70 hover:opacity-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 16 16">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M12 4L4 12M4 4l8 8"/>
            </svg>
          </button>
        </div>
        <form onSubmit={submit} className="px-6 py-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Filename</label>
              <div className="rounded bg-gray-50 px-3 py-2 text-sm">{lineItem?.filename || lineItem?.doc_type || 'Document'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Billable Pages</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={billablePages}
                onChange={e=> setBillablePages(e.target.value)}
                className="w-full rounded-lg border-0 bg-gray-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Unit Rate Override (Optional)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitRateOverride}
                  onChange={e=> setUnitRateOverride(e.target.value)}
                  className="w-full rounded-lg border-0 bg-gray-100 pl-7 pr-3 py-2 text-sm"
                />
              </div>
              <p className="mt-1 text-xs text-gray-600">Current base rate: ${Number(lineItem?.unit_rate || 0).toFixed(2)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Override Reason</label>
              <textarea
                rows={3}
                value={overrideReason}
                onChange={e=> setOverrideReason(e.target.value)}
                className="w-full rounded-lg border-0 bg-gray-100 px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="rounded bg-gray-50 px-3 py-3">
              <p className="font-medium">Preview Total: ${total}</p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50">Save Changes</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
