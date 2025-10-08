import { useEffect, useMemo, useState } from 'react';
import PhoneInput from '../form/PhoneInput';

function classNames(...c){ return c.filter(Boolean).join(' '); }

const ORDERING_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'individual', label: 'Individual' },
  { value: 'business', label: 'Company/Business' }
];

export default function UserForm({ mode = 'create', initial = null, onSubmit, submitting = false }){
  const [fullName, setFullName] = useState(initial.full_name || '');
  const [email, setEmail] = useState(initial.email || '');
  const [phone, setPhone] = useState(initial.phone || ''); // E.164 or ''
  const [orderingType, setOrderingType] = useState(initial.ordering_type || '');
  const [companyName, setCompanyName] = useState(initial.company_name || '');
  const [designation, setDesignation] = useState(initial.designation || '');
  const [frequency, setFrequency] = useState(initial.frequency || '');
  const [notes, setNotes] = useState(initial.notes || '');
  const [tags, setTags] = useState(Array.isArray(initial.tags) ? initial.tags.join(', ') : '');
  const [errors, setErrors] = useState({});
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setFullName(initial.full_name || '');
    setEmail(initial.email || '');
    setPhone(initial.phone || '');
    setOrderingType(initial.ordering_type || '');
    setCompanyName(initial.company_name || '');
    setDesignation(initial.designation || '');
    setFrequency(initial.frequency || '');
    setNotes(initial.notes || '');
    setTags(Array.isArray(initial.tags) ? initial.tags.join(', ') : '');
    setErrors({});
    setEmailExists(false);
  }, [initial]);

  useEffect(() => {
    if (mode !== 'create') return;
    const e = email.trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) { setEmailExists(false); return; }
    const ctrl = new AbortController();
    setCheckingEmail(true);
    fetch('/api/check-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }), signal: ctrl.signal })
      .then(r => r.ok ? r.json() : Promise.resolve({ exists: false }))
      .then(json => { setEmailExists(Boolean(json.exists)); })
      .catch(() => {})
      .finally(() => setCheckingEmail(false));
    return () => ctrl.abort();
  }, [email, mode]);

  function validate(){
    const errs = {};
    const fn = fullName.trim();
    if (fn.length < 2 || fn.length > 100) errs.full_name = 'Full Name must be 2-100 characters';
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) errs.email = 'Enter a valid email address';
    if (mode === 'create' && emailExists) errs.email = 'Email already exists';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(ev){
    ev.preventDefault();
    if (!validate()) return;
    const payload = {
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone || null,
      ordering_type: orderingType || null,
      company_name: orderingType === 'business' ? (companyName || null) : null,
      designation: orderingType === 'business' ? (designation || null) : null,
      frequency: orderingType === 'business' ? (frequency || null) : null,
      notes: notes ? notes.trim() : null,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []
    };
    onSubmit && onSubmit(payload);
  }

  const isBusiness = orderingType === 'business';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
        <input type="text" value={fullName} onChange={e=>setFullName(e.target.value)} className={classNames('w-full rounded-md border px-3 py-2 text-sm', errors.full_name ? 'border-red-500' : 'border-gray-300')} placeholder="Jane Smith" />
        {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className={classNames('w-full rounded-md border px-3 py-2 text-sm', errors.email ? 'border-red-500' : 'border-gray-300')} placeholder="customer@example.com" />
        <div className="mt-1 flex items-center gap-2 text-xs">
          {checkingEmail && <span className="text-gray-500">Checking...</span>}
          {mode==='create' && !checkingEmail && emailExists && <span className="text-red-600">Email already exists</span>}
        </div>
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
      </div>
      <div>
        <PhoneInput label="Phone (optional)" valueE164={phone || ''} onChangeE164={setPhone} required={false} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">I am ordering as</label>
        <select value={orderingType} onChange={e=>setOrderingType(e.target.value)} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
          {ORDERING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {isBusiness && (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Company Name</label>
            <input type="text" value={companyName} onChange={e=>setCompanyName(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Designation</label>
            <input type="text" value={designation} onChange={e=>setDesignation(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Frequency of Translation Services</label>
            <select value={frequency} onChange={e=>setFrequency(e.target.value)} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="">Select...</option>
              <option value="one-time">One-time only</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="ongoing">Ongoing/As needed</option>
            </select>
          </div>
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Internal Notes</label>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Add context, preferences, or details for the team" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
        <input type="text" value={tags} onChange={e=>setTags(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="vip, enterprise, spanish" />
      </div>
      <div className="flex items-center gap-2">
        <button type="submit" disabled={submitting} className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{mode==='create' ? 'Create User' : 'Save Changes'}</button>
      </div>
    </form>
  );
}
