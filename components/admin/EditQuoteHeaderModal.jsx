import { useEffect, useState } from 'react';
import PhoneInput from '../form/PhoneInput';

export default function EditQuoteHeaderModal({ open, onClose, quote, onSaved }){
  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    source_language: '',
    target_language: '',
    intended_use: ''
  });
  const [saving, setSaving] = useState(false);
  useEffect(()=>{
    if (open){
      setForm({
        customer_name: quote?.customer_name || '',
        customer_email: quote?.customer_email || '',
        customer_phone: quote?.customer_phone || '',
        source_language: quote?.source_language || '',
        target_language: quote?.target_language || '',
        intended_use: quote?.intended_use || ''
      });
    }
  }, [open, quote]);
  if (!open) return null;

  function setField(k, v){ setForm(f => ({ ...f, [k]: v })); }
  const emailOk = (s)=> /\S+@\S+\.\S+/.test(String(s||''));
  const canSave = form.customer_name.trim() && emailOk(form.customer_email);

  async function save(){
    setSaving(true);
    try{
      const payload = {
        name: form.customer_name,
        email: form.customer_email,
        phone: form.customer_phone || null,
        source_lang: form.source_language || null,
        target_lang: form.target_language || null,
        intended_use: form.intended_use || null
      };
      const resp = await fetch(`/api/admin/quotes/${quote.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || `Request failed (${resp.status})`);
      onSaved && onSaved(json.quote);
      onClose && onClose();
    } catch(e){
      alert(e.message);
    } finally{ setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-xl rounded bg-white p-4">
        <h3 className="text-lg font-semibold mb-3">Edit Quote Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Customer Name *</label>
            <input value={form.customer_name} onChange={e=>setField('customer_name', e.target.value)} className="w-full rounded border px-2 py-2"/>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input type="email" value={form.customer_email} onChange={e=>setField('customer_email', e.target.value)} className="w-full rounded border px-2 py-2"/>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <PhoneInput valueE164={form.customer_phone} onChangeE164={v=>setField('customer_phone', v||'')} required={false} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Source Language</label>
            <input value={form.source_language} onChange={e=>setField('source_language', e.target.value)} className="w-full rounded border px-2 py-2"/>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Target Language</label>
            <input value={form.target_language} onChange={e=>setField('target_language', e.target.value)} className="w-full rounded border px-2 py-2"/>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Intended Use</label>
            <input value={form.intended_use} onChange={e=>setField('intended_use', e.target.value)} className="w-full rounded border px-2 py-2"/>
          </div>
        </div>
        <div className="flex gap-2 pt-4">
          <button onClick={save} disabled={!canSave || saving} className="rounded bg-black px-3 py-2 text-white disabled:opacity-50">Save</button>
          <button onClick={onClose} className="rounded border px-3 py-2">Cancel</button>
        </div>
      </div>
    </div>
  );
}
