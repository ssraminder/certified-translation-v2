import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { getServerSideAdminWithPermission } from '../../lib/withAdminPage';
import { canEditSettings } from '../../lib/permissions';

export const getServerSideProps = getServerSideAdminWithPermission('settings','view');

function classNames(...v){return v.filter(Boolean).join(' ')}

export default function AdminShippingOptions(){
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [options, setOptions] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', price: 0, delivery_time: '', require_shipping_address: false, is_default: false, is_always_selected: false, is_active: true, sort_order: 0 });
  const [editingId, setEditingId] = useState(null);
  const [role, setRole] = useState(null);

  const canEdit = canEditSettings(role);

  async function load(){
    setLoading(true); setError('');
    try{
      const r = await fetch('/api/admin/shipping-options');
      const j = await r.json();
      if(!r.ok) throw new Error(j.error||'Failed to load');
      setOptions(j.options||[]);
    }catch(e){ setError(e.message); }
    finally{ setLoading(false); }
  }

  async function loadMe(){
    try{ const r = await fetch('/api/admin/me'); const j = await r.json(); if(r.ok) setRole(j.role||null); } catch {}
  }

  useEffect(()=>{ load(); loadMe(); },[]);

  function update(k,v){ setForm(prev=>({...prev,[k]:v})); }
  function resetForm(){ setForm({ name: '', description: '', price: 0, delivery_time: '', require_shipping_address: false, is_default: false, is_always_selected: false, is_active: true, sort_order: 0 }); setEditingId(null); }

  async function save(){
    try{
      setError('');
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/admin/shipping-options/${editingId}` : '/api/admin/shipping-options';
      const r = await fetch(url,{ method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(form)});
      const j = await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(j.error||'Save failed');
      resetForm();
      await load();
    }catch(e){ setError(e.message); }
  }

  async function del(id){
    if(!confirm('Delete this option?')) return;
    const r = await fetch(`/api/admin/shipping-options/${id}`,{ method:'DELETE' });
    if(!r.ok){ const j = await r.json(); alert(j.error||'Delete failed'); return; }
    await load();
  }

  function onEdit(o){
    setEditingId(o.id);
    setForm({
      name: o.name||'', description: o.description||'', price: Number(o.price||0), delivery_time: o.delivery_time||'',
      require_shipping_address: !!o.require_shipping_address, is_default: !!o.is_default, is_always_selected: !!o.is_always_selected, is_active: !!o.is_active, sort_order: Number(o.sort_order||0)
    });
  }

  return (
    <>
      <Head><title>Admin - Shipping Options</title></Head>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
          <h1 className="text-2xl font-semibold text-gray-900">Shipping Options Management</h1>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit' : 'Add New'} Shipping Option</h2>
              {editingId && canEdit && <button className="text-sm text-gray-600 underline" onClick={resetForm}>Cancel Edit</button>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Name" required value={form.name} onChange={v=>update('name',v)} disabled={!canEdit} />
              <Input label="Price" required type="number" step="0.01" value={form.price} onChange={v=>update('price', Number(v))} disabled={!canEdit} />
              <Input label="Delivery Time" value={form.delivery_time} onChange={v=>update('delivery_time',v)} disabled={!canEdit} />
              <Input label="Sort Order" type="number" value={form.sort_order} onChange={v=>update('sort_order', Number(v))} disabled={!canEdit} />
              <Textarea label="Description" className="md:col-span-2" value={form.description} onChange={v=>update('description',v)} disabled={!canEdit} />
              <Checkbox label="Require Shipping Address" checked={form.require_shipping_address} onChange={v=>update('require_shipping_address', v)} disabled={!canEdit} />
              <Checkbox label="Set as Default" checked={form.is_default} onChange={v=>update('is_default', v)} disabled={!canEdit} />
              <Checkbox label="Always Selected" checked={form.is_always_selected} onChange={v=>update('is_always_selected', v)} disabled={!canEdit} />
              <Checkbox label="Active" checked={form.is_active} onChange={v=>update('is_active', v)} disabled={!canEdit} />
            </div>
            <div className="mt-4 flex justify-end">
              {canEdit && <button className="rounded-lg bg-cyan-600 px-5 py-2 text-sm font-medium text-white hover:bg-cyan-700" onClick={save}>{editingId ? 'Save Changes' : 'Add Shipping Option'}</button>}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-3 text-sm font-medium text-gray-700">Options</div>
            {loading ? (
              <div className="text-sm text-gray-600">Loading...</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {options.map(o => (
                  <div key={o.id} className="py-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <div className="md:col-span-4">
                      <div className="flex items-center gap-2">
                        {o.is_always_selected && <span title="Always selected">🔒</span>}
                        <div className="font-medium text-gray-900">{o.name}</div>
                      </div>
                      {o.description && <div className="text-xs text-gray-600">{o.description}</div>}
                    </div>
                    <div className="md:col-span-2 text-sm">{Number(o.price||0) > 0 ? `$${Number(o.price).toFixed(2)}` : 'FREE'}</div>
                    <div className="md:col-span-1 text-sm">{o.require_shipping_address ? 'Yes' : 'No'}</div>
                    <div className="md:col-span-1 text-sm">{o.is_default ? '✓' : ''}</div>
                    <div className="md:col-span-1 text-sm">{o.is_always_selected ? '✓' : ''}</div>
                    <div className="md:col-span-1 text-sm">{o.is_active ? '✓' : ''}</div>
                    <div className="md:col-span-2 flex justify-end gap-2">
                      {canEdit && <button className="text-sm text-cyan-700 hover:underline" onClick={()=>onEdit(o)}>Edit</button>}
                      {canEdit && !o.is_always_selected && (
                        <button className="text-sm text-red-600 hover:underline" onClick={()=>del(o.id)}>Delete</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function Input({ label, required, type='text', className='', step, value, onChange, disabled }){
  return (
    <label className={classNames('block', className)}>
      <span className="text-sm text-gray-700">{label}{required && ' *'}</span>
      <input type={type} step={step} value={value} onChange={e=>onChange(e.target.value)} disabled={disabled} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500" />
    </label>
  );
}
function Textarea({ label, className='', value, onChange, disabled }){
  return (
    <label className={classNames('block', className)}>
      <span className="text-sm text-gray-700">{label}</span>
      <textarea value={value} onChange={e=>onChange(e.target.value)} disabled={disabled} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500" rows={3} />
    </label>
  );
}
function Checkbox({ label, checked, onChange, disabled }){
  return (
    <label className="inline-flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" className="h-4 w-4" checked={checked} onChange={e=>onChange(e.target.checked)} disabled={disabled} />{label}</label>
  );
}
