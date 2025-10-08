import { useEffect, useMemo, useState } from 'react';

const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Super Admin', description: 'Full system access, can manage all admins, settings, and data' },
  { value: 'manager', label: 'Manager', description: 'Can manage quotes, orders, users, and most settings' },
  { value: 'project_manager', label: 'Project Manager', description: 'Manages orders and HITL quotes, limited settings' },
  { value: 'associate', label: 'Associate', description: 'Can update order status and upload files' },
  { value: 'accountant', label: 'Accountant', description: 'View-only access with analytics and export' },
  { value: 'sales', label: 'Sales', description: 'Can create users and view quotes/orders' },
];

function classNames(...c){ return c.filter(Boolean).join(' '); }

export default function AdminForm({ mode = 'create', initial = {}, disableRole = false, disableActive = false, onSubmit, submitting = false }){
  const [fullName, setFullName] = useState(initial?.full_name || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [role, setRole] = useState(initial?.role || 'manager');
  const [isActive, setIsActive] = useState(initial?.is_active !== false);
  const [errors, setErrors] = useState({});
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  useEffect(() => { if (!initial || Object.keys(initial).length === 0) return; setFullName(initial.full_name || ''); setEmail(initial.email || ''); setRole(initial.role || 'manager'); setIsActive(initial.is_active !== false); setErrors({}); setEmailExists(false); }, [initial]);

  useEffect(() => {
    if (mode !== 'create') return; // only live-check for create
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
    if (!ROLE_OPTIONS.find(o => o.value === role)) errs.role = 'Select a valid role';
    if (mode === 'create' && emailExists) errs.email = 'Email already exists';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(ev){
    ev.preventDefault();
    if (!validate()) return;
    const payload = { full_name: fullName.trim(), email: email.trim().toLowerCase(), role, is_active: Boolean(isActive) };
    onSubmit && onSubmit(payload);
  }

  const selectedRole = useMemo(() => ROLE_OPTIONS.find(o => o.value === role), [role]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
        <input type="text" value={fullName} onChange={e=>setFullName(e.target.value)} className={classNames('w-full rounded-md border px-3 py-2 text-sm', errors.full_name ? 'border-red-500' : 'border-gray-300')} placeholder="Jane Smith" />
        {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className={classNames('w-full rounded-md border px-3 py-2 text-sm', errors.email ? 'border-red-500' : 'border-gray-300')} placeholder="admin@example.com" />
        <div className="mt-1 flex items-center gap-2 text-xs">
          {checkingEmail && <span className="text-gray-500">Checking...</span>}
          {mode==='create' && !checkingEmail && emailExists && <span className="text-red-600">Email already exists</span>}
        </div>
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
        <select value={role} onChange={e=>setRole(e.target.value)} disabled={disableRole} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100">
          {ROLE_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
        </select>
        {disableRole && <p className="mt-1 text-xs text-gray-500">You cannot change your own role</p>}
        {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role}</p>}
        {selectedRole && <p className="mt-2 text-xs text-gray-600">{selectedRole.description}</p>}
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input type="checkbox" checked={isActive} onChange={e=>setIsActive(e.target.checked)} disabled={disableActive} className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
          Account Active
        </label>
        {disableActive && <p className="text-xs text-gray-500">You cannot deactivate your own account</p>}
      </div>
      <div className="flex items-center gap-2">
        <button type="submit" disabled={submitting} className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{mode==='create' ? 'Create Admin' : 'Save Changes'}</button>
      </div>
    </form>
  );
}
