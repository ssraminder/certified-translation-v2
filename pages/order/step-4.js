import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getErrorMessage } from '../../lib/errorMessage';
import PhoneInput from '../../components/form/PhoneInput';
import CountrySelect from '../../components/form/CountrySelect';
import RegionSelect from '../../components/form/RegionSelect';
import { formatPostal, labelForPostal } from '../../lib/formatters/postal';
import { isValid as isPhoneValid } from '../../lib/formatters/phone';

const GST_RATE = 0.05;

function classNames(...v) { return v.filter(Boolean).join(' '); }
function round2(n){ const x = Number(n); return Math.round((Number.isFinite(x)?x:0)*100)/100; }
function formatCurrency(v){ return new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(round2(v)); }
function emailOk(v){ return /.+@.+\..+/.test(String(v||'')); }

export default function Step4() {
  const router = useRouter();
  const quoteId = router.query.quote;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(new Set());

  const [billing, setBilling] = useState({
    full_name: '', email: '', phone: '', address_line1: '', address_line2: '', city: '', province_state: '', postal_code: '', country: 'Canada'
  });
  const [shipSame, setShipSame] = useState(true);
  const [shipping, setShipping] = useState({
    full_name: '', phone: '', address_line1: '', address_line2: '', city: '', province_state: '', postal_code: '', country: 'Canada'
  });

  const [savedBilling, setSavedBilling] = useState([]);
  const [savedShipping, setSavedShipping] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [quoteTotals, setQuoteTotals] = useState({ subtotal: 0, tax: 0, total: 0 });

  const requiresShippingAddress = useMemo(() => {
    return options.some(o => selected.has(o.id) && o.require_shipping_address);
  }, [options, selected]);

  const shippingLines = useMemo(() => {
    const lines = options.filter(o => selected.has(o.id));
    return lines.map(o => ({ name: o.name, price: Number(o.price||0) }));
  }, [options, selected]);

  const shippingTotal = useMemo(() => round2(shippingLines.reduce((s,l)=>s + (l.price||0), 0)), [shippingLines]);

  const grandSubtotal = useMemo(() => round2((quoteTotals.subtotal||0) + shippingTotal), [quoteTotals, shippingTotal]);
  const tax = useMemo(() => round2(grandSubtotal * GST_RATE), [grandSubtotal]);
  const grandTotal = useMemo(() => round2(grandSubtotal + tax), [grandSubtotal, tax]);

  useEffect(() => {
    if (!quoteId) return;
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const resp = await fetch('/api/shipping-options');
        const json = await resp.json();
        if (!resp.ok) throw new Error(json.error || 'Failed to load shipping options');
        const opts = Array.isArray(json.options) ? json.options : [];
        const nextSel = new Set();
        opts.forEach(o => { if (o.is_always_selected) nextSel.add(o.id); });
        if (nextSel.size === 0 && opts.length > 0) {
          const def = opts.find(o => o.is_default) || opts[0];
          if (def) nextSel.add(def.id);
        }
        if (!isMounted) return;
        setOptions(opts);
        setSelected(nextSel);

        const q = await fetch(`/api/quote-results?quote=${quoteId}`);
        if (q.ok) {
          const qj = await q.json();
          const { subtotal = 0, contact_name, contact_email, contact_phone } = qj || {};
          setQuoteTotals({ subtotal, tax: 0, total: subtotal });
          setBilling(prev => ({
            ...prev,
            full_name: prev.full_name || contact_name || '',
            email: prev.email || contact_email || '',
            phone: prev.phone || contact_phone || ''
          }));
        }
      } catch (err) {
        if (!isMounted) return;
        setError(getErrorMessage(err));
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [quoteId]);

  // Load saved addresses and session user id if authenticated
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const sess = await fetch('/api/auth/session');
        const sj = await sess.json();
        if (sj?.authenticated) {
          setCurrentUserId(sj.user?.id || null);
          const [billRes, shipRes] = await Promise.all([
            fetch('/api/dashboard/user-addresses?type=billing'),
            fetch('/api/dashboard/user-addresses?type=shipping')
          ]);
          if (cancelled) return;
          if (billRes.ok) {
            const list = await billRes.json();
            setSavedBilling(Array.isArray(list) ? list : []);
            const def = (list || []).find(a=>a.is_default);
            if (def) applyBillingFrom(def);
          }
          if (shipRes.ok) {
            const list = await shipRes.json();
            setSavedShipping(Array.isArray(list) ? list : []);
          }
        }
      } catch {
        // ignore
      }
    }
    run();
    return () => { cancelled = true; };
  }, []);

  function applyBillingFrom(addr){
    if (!addr) return;
    setBilling(prev => ({
      ...prev,
      full_name: addr.full_name || prev.full_name,
      phone: addr.phone || prev.phone,
      address_line1: addr.address_line_1 || prev.address_line1,
      address_line2: addr.address_line_2 || '',
      city: addr.city || prev.city,
      province_state: addr.state_province || prev.province_state,
      postal_code: addr.postal_code || prev.postal_code,
      country: addr.country || prev.country
    }));
  }

  function applyShippingFrom(addr){
    if (!addr) return;
    setShipping(prev => ({
      ...prev,
      full_name: addr.full_name || prev.full_name,
      phone: addr.phone || prev.phone,
      address_line1: addr.address_line_1 || prev.address_line1,
      address_line2: addr.address_line_2 || '',
      city: addr.city || prev.city,
      province_state: addr.state_province || prev.province_state,
      postal_code: addr.postal_code || prev.postal_code,
      country: addr.country || prev.country
    }));
  }

  function toggle(id, forced) {
    const copy = new Set(selected);
    const opt = options.find(o => o.id === id);
    if (!opt) return;
    if (opt.is_always_selected) return;
    if (forced === true) copy.add(id); else if (forced === false) copy.delete(id); else if (copy.has(id)) copy.delete(id); else copy.add(id);
    if (copy.size === 0) {
      const always = options.find(o => o.is_always_selected);
      if (always) copy.add(always.id);
    }
    setSelected(copy);
  }

  function updateField(setter, key, value) { setter(prev => ({ ...prev, [key]: value })); }

  async function handleSave() {
    try {
      setError('');
      if (selected.size === 0) {
        throw new Error('Please select at least one delivery method');
      }
      if (!emailOk(billing.email)) throw new Error('Please enter a valid email');
      if (!isPhoneValid(billing.phone, billing.country)) throw new Error('Please enter a valid phone');
      const requiredBilling = ['full_name','address_line1','city','province_state','postal_code','country'];
      for (const k of requiredBilling) if (!String(billing[k]||'').trim()) throw new Error('Please complete all required billing fields');

      let shippingPayload = null;
      if (requiresShippingAddress) {
        if (shipSame) {
          const { email: _e, ...copyBill } = billing;
          shippingPayload = copyBill;
        } else {
          const requiredShip = ['full_name','phone','address_line1','city','province_state','postal_code','country'];
          for (const k of requiredShip) if (!String(shipping[k]||'').trim()) throw new Error('Please complete all required shipping fields');
          shippingPayload = shipping;
        }
      }

      const addrResp = await fetch('/api/addresses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId, billing, shipping: shippingPayload })
      });
      const addrJson = await addrResp.json();
      if (!addrResp.ok) throw new Error(addrJson.error || 'Failed to save addresses');

      const optResp = await fetch(`/api/quotes/${quoteId}/shipping`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIds: Array.from(selected) })
      });
      const optJson = await optResp.json();
      if (!optResp.ok) throw new Error(optJson.error || 'Failed to save shipping');

      let createdOrder = null;
      try {
        const createOrder = await fetch('/api/orders/create-from-quote', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quote_id: quoteId,
            billing_address: billing,
            shipping_address: shippingPayload,
            shipping_option_ids: Array.from(selected),
            user_id: currentUserId || undefined
          })
        });
        const orderJson = await createOrder.json().catch(()=>null);
        createdOrder = orderJson?.order || null;
      } catch {}

      if (createdOrder) {
        router.push({ pathname: '/checkout', query: { order: createdOrder.id } });
        return;
      }

      throw new Error('Failed to create order. Please try again.');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (!quoteId) return null;

  return (
    <>
      <Head><title>Step 4 - Shipping & Address</title></Head>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
          <h1 className="text-2xl font-semibold text-gray-900">Step 4: Shipping Options & Address</h1>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Shipping Method</h2>
            <p className="text-xs text-gray-500 mb-4">Choose how you'd like to receive your documents</p>
            <div className="space-y-3">
              {options.map(o => {
                const checked = selected.has(o.id);
                const disabled = o.is_always_selected;
                return (
                  <label key={o.id} className={classNames('flex items-start justify-between rounded-xl border p-4', checked ? 'border-cyan-300 bg-cyan-50' : 'border-gray-200 bg-white')}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" className="h-4 w-4" checked={checked} disabled={disabled} onChange={() => toggle(o.id)} />
                        <span className={classNames('text-sm font-medium', disabled ? 'text-gray-500' : 'text-gray-900')}>{o.name}</span>
                        {disabled && <span className="text-[11px] text-gray-500">(Always included)</span>}
                      </div>
                      {o.description && <p className="mt-1 text-xs text-gray-600">{o.description}</p>}
                      {o.delivery_time && <p className="mt-0.5 text-[11px] text-gray-500">{o.delivery_time}</p>}
                    </div>
                    <div className="ml-4 whitespace-nowrap text-sm font-medium text-gray-900">{Number(o.price||0) > 0 ? formatCurrency(o.price) : 'FREE'}</div>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Billing Address</h2>
            </div>
            {savedBilling.length > 0 && (
              <div className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3">
                <div className="text-sm text-cyan-900">Saved billing addresses</div>
                <div className="mt-2">
                  <select className="w-full rounded-md border border-cyan-300 px-3 py-2 text-sm" onChange={e=>{
                    const id = e.target.value; const addr = savedBilling.find(a=>String(a.id)===String(id)); if (addr) applyBillingFrom(addr);
                  }}>
                    <option value="">Select a saved address</option>
                    {savedBilling.map(a => (
                      <option key={a.id} value={a.id}>{`${a.full_name || ''} — ${a.address_line_1 || ''} ${a.city ? '('+a.city+')' : ''}`}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Full Name" required value={billing.full_name} onChange={v=>updateField(setBilling,'full_name',v)} />
              <Input label="Email" required type="email" value={billing.email} onChange={v=>updateField(setBilling,'email',v)} />
              <div>
                <PhoneInput required valueE164={billing.phone} onChangeE164={v=>updateField(setBilling,'phone',v||'')} defaultCountry={billing.country} />
              </div>
              <div />
              <Input label="Address Line 1" required className="md:col-span-2" value={billing.address_line1} onChange={v=>updateField(setBilling,'address_line1',v)} />
              <Input label="Address Line 2" className="md:col-span-2" value={billing.address_line2} onChange={v=>updateField(setBilling,'address_line2',v)} />
              <Input label="City" required value={billing.city} onChange={v=>updateField(setBilling,'city',v)} />
              <div>
                <RegionSelect required country={billing.country} value={billing.province_state} onChange={v=>updateField(setBilling,'province_state',v)} />
              </div>
              <label className="block">
                <span className="text-sm text-gray-700">{labelForPostal(billing.country)} *</span>
                <input value={billing.postal_code} onChange={e=>updateField(setBilling,'postal_code', formatPostal(billing.country, e.target.value))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <div>
                <CountrySelect required autoDetect value={billing.country} onChange={v=>updateField(setBilling,'country',v)} />
              </div>
            </div>
          </section>

          {requiresShippingAddress && (
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Shipping Address</h2>
                <label className="text-sm text-gray-700 flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4" checked={shipSame} onChange={e=>setShipSame(e.target.checked)} />
                  Same as billing address
                </label>
              </div>
              {!shipSame && (
                <>
                  {savedShipping.length > 0 && (
                    <div className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3">
                      <div className="text-sm text-cyan-900">Saved shipping addresses</div>
                      <div className="mt-2">
                        <select className="w-full rounded-md border border-cyan-300 px-3 py-2 text-sm" onChange={e=>{
                          const id = e.target.value; const addr = savedShipping.find(a=>String(a.id)===String(id)); if (addr) applyShippingFrom(addr);
                        }}>
                          <option value="">Select a saved address</option>
                          {savedShipping.map(a => (
                            <option key={a.id} value={a.id}>{`${a.full_name || ''} — ${a.address_line_1 || ''} ${a.city ? '('+a.city+')' : ''}`}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Full Name" required value={shipping.full_name} onChange={v=>updateField(setShipping,'full_name',v)} />
                    <div>
                      <PhoneInput required valueE164={shipping.phone} onChangeE164={v=>updateField(setShipping,'phone',v||'')} defaultCountry={shipping.country} />
                    </div>
                    <Input label="Address Line 1" required className="md:col-span-2" value={shipping.address_line1} onChange={v=>updateField(setShipping,'address_line1',v)} />
                    <Input label="Address Line 2" className="md:col-span-2" value={shipping.address_line2} onChange={v=>updateField(setShipping,'address_line2',v)} />
                    <Input label="City" required value={shipping.city} onChange={v=>updateField(setShipping,'city',v)} />
                    <div>
                      <RegionSelect required country={shipping.country} value={shipping.province_state} onChange={v=>updateField(setShipping,'province_state',v)} />
                    </div>
                    <label className="block">
                      <span className="text-sm text-gray-700">{labelForPostal(shipping.country)} *</span>
                      <input value={shipping.postal_code} onChange={e=>updateField(setShipping,'postal_code', formatPostal(shipping.country, e.target.value))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                    </label>
                    <div>
                      <CountrySelect required autoDetect value={shipping.country} onChange={v=>updateField(setShipping,'country',v)} />
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
            <div className="mt-3 space-y-2 text-sm">
              <Row label="Documents Subtotal" value={formatCurrency(quoteTotals.subtotal)} />
              <div>
                <div className="text-gray-600">Shipping:</div>
                <ul className="mt-1 ml-4 list-disc text-gray-800">
                  {shippingLines.map((l, i) => (
                    <li key={i} className="flex items-center justify-between"><span>{l.name}</span><span>{l.price>0?formatCurrency(l.price):'FREE'}</span></li>
                  ))}
                </ul>
                <div className="mt-1 flex items-center justify-between font-medium">
                  <span>Total Shipping</span>
                  <span>{formatCurrency(shippingTotal)}</span>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-2" />
              <Row label="Subtotal" value={formatCurrency(grandSubtotal)} />
              <Row label="Tax (5% GST)" value={formatCurrency(tax)} />
              <div className="border-t border-gray-200 mt-2" />
              <Row label="TOTAL" value={formatCurrency(grandTotal)} bold />
            </div>
          </section>

          <div className="flex items-center justify-end gap-3">
            <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={()=>router.back()}>Back</button>
            <button type="button" className="rounded-lg bg-cyan-600 px-5 py-2 text-sm font-medium text-white hover:bg-cyan-700" onClick={handleSave}>Continue to Payment</button>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className={classNames('flex items-center justify-between', bold ? 'font-semibold text-gray-900' : 'text-gray-700')}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Input({ label, required, type='text', className='', value, onChange }) {
  return (
    <label className={classNames('block', className)}>
      <span className="text-sm text-gray-700">{label}{required && ' *'}</span>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
    </label>
  );
}
