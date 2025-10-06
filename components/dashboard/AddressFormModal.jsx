import { useEffect, useState } from 'react';
import CountrySelect from '../form/CountrySelect';
import RegionSelect from '../form/RegionSelect';
import PhoneInput from '../form/PhoneInput';
import { formatPostal, labelForPostal } from '../../lib/formatters/postal';

export default function AddressFormModal({ isOpen, onClose, initial, addressType, onSave }) {
  const [form, setForm] = useState({
    full_name: '', company_name: '', address_line_1: '', address_line_2: '', city: '', state_province: '', postal_code: '', country: 'Canada', phone: '', is_default: false,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initial) setForm({ ...initial });
    else setForm((f) => ({ ...f, is_default: false }));
  }, [initial]);

  if (!isOpen) return null;

  function handleChange(e){
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  function handlePostalChange(v){
    setForm(f => ({ ...f, postal_code: formatPostal(f.country, v) }));
  }

  function validate(){
    const req = ['full_name','address_line_1','city','state_province','postal_code','country'];
    const e = {};
    for (const k of req) if (!String(form[k] || '').trim()) e[k] = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(){
    if (!validate()) return;
    try {
      setSaving(true);
      await onSave({ ...form, address_type: addressType });
      onClose();
    } catch (err) {
      alert(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{initial ? 'Edit Address' : 'Add Address'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name *</label>
            <input name="full_name" value={form.full_name} onChange={handleChange} className="mt-1 w-full border rounded-lg px-3 py-2" />
            {errors.full_name && <p className="text-xs text-red-600 mt-1">{errors.full_name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Company Name</label>
            <input name="company_name" value={form.company_name || ''} onChange={handleChange} className="mt-1 w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Address Line 1 *</label>
            <input name="address_line_1" value={form.address_line_1} onChange={handleChange} className="mt-1 w-full border rounded-lg px-3 py-2" />
            {errors.address_line_1 && <p className="text-xs text-red-600 mt-1">{errors.address_line_1}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Address Line 2</label>
            <input name="address_line_2" value={form.address_line_2 || ''} onChange={handleChange} className="mt-1 w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <CountrySelect required value={form.country} onChange={v=>setForm(f=>({ ...f, country: v }))} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">City *</label>
              <input name="city" value={form.city} onChange={handleChange} className="mt-1 w-full border rounded-lg px-3 py-2" />
              {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city}</p>}
            </div>
            <div>
              <RegionSelect required country={form.country} value={form.state_province} onChange={v=>setForm(f=>({ ...f, state_province: v }))} />
              {errors.state_province && <p className="text-xs text-red-600 mt-1">{errors.state_province}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{labelForPostal(form.country)} *</label>
              <input name="postal_code" value={form.postal_code} onChange={e=>handlePostalChange(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
              {errors.postal_code && <p className="text-xs text-red-600 mt-1">{errors.postal_code}</p>}
            </div>
            <div>
              <PhoneInput label="Phone" valueE164={form.phone} onChangeE164={v=>setForm(f=>({ ...f, phone: v }))} />
            </div>
          </div>
          <div className="flex items-center">
            <input id="is_default" type="checkbox" name="is_default" checked={!!form.is_default} onChange={handleChange} className="mr-2" />
            <label htmlFor="is_default" className="text-sm text-gray-700">Set as default</label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className={`px-4 py-2 rounded-lg text-white ${saving ? 'bg-cyan-300' : 'bg-cyan-500 hover:bg-cyan-600'}`}>{saving ? 'Saving...' : 'Save Address'}</button>
        </div>
      </div>
    </div>
  );
}
