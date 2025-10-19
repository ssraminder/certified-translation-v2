import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Spinner from '../components/dashboard/Spinner';
import PhoneInput from '../components/form/PhoneInput';
import CountrySelect from '../components/form/CountrySelect';
import RegionSelect from '../components/form/RegionSelect';
import { formatPostal, labelForPostal } from '../lib/formatters/postal';
import { isValid as isPhoneValid } from '../lib/formatters/phone';

const GST_RATE = 0.05;

function classNames(...v) { return v.filter(Boolean).join(' '); }
function round2(n){ const x = Number(n); return Math.round((Number.isFinite(x)?x:0)*100)/100; }
function formatCurrency(v){ return new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(round2(v)); }
function emailOk(v){ return /.+@.+\..+/.test(String(v||'')); }

export default function QuoteCheckoutPage() {
  const router = useRouter();
  const { token } = router.query;

  const [quote, setQuote] = useState(null);
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const [billing, setBilling] = useState({
    full_name: '', email: '', phone: '', address_line1: '', address_line2: '', city: '', province_state: '', postal_code: '', country: 'Canada'
  });
  const [shipSame, setShipSame] = useState(true);
  const [shipping, setShipping] = useState({
    full_name: '', phone: '', address_line1: '', address_line2: '', city: '', province_state: '', postal_code: '', country: 'Canada'
  });

  const requiresShippingAddress = useMemo(() => {
    return shippingOptions.some(o => selectedShipping && selectedShipping.toString() === o.id.toString() && o.require_shipping_address);
  }, [shippingOptions, selectedShipping]);

  const shippingTotal = useMemo(() => {
    const opt = shippingOptions.find(o => selectedShipping && selectedShipping.toString() === o.id.toString());
    return round2(opt ? Number(opt.price || 0) : 0);
  }, [shippingOptions, selectedShipping]);

  const grandSubtotal = useMemo(() => {
    const results = quote?.quoteResults || {};
    return round2((results.subtotal || 0) + shippingTotal);
  }, [quote?.quoteResults, shippingTotal]);

  const tax = useMemo(() => round2(grandSubtotal * GST_RATE), [grandSubtotal]);
  const grandTotal = useMemo(() => round2(grandSubtotal + tax), [grandSubtotal, tax]);

  // Load quote details
  useEffect(() => {
    if (!token) return;
    const fetchQuote = async () => {
      try {
        const res = await fetch(`/api/quotes/view-by-token?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!data.success) {
          setError(data.error || 'Failed to load quote');
          return;
        }

        setQuote(data);
        const quoteData = data.quote || {};
        setBilling(prev => ({
          ...prev,
          full_name: quoteData.customer_first_name || '',
          email: quoteData.customer_email || '',
          phone: quoteData.customer_phone || ''
        }));

        // Fetch available shipping options
        const shippingRes = await fetch('/api/shipping-options');
        const shippingData = await shippingRes.json();
        if (shippingData.options) {
          setShippingOptions(shippingData.options);
          if (shippingData.options.length > 0) {
            const alwaysSelected = shippingData.options.find(o => o.is_always_selected);
            if (alwaysSelected) {
              setSelectedShipping(String(alwaysSelected.id));
            } else {
              const firstActive = shippingData.options.find(o => o.is_active);
              if (firstActive) {
                setSelectedShipping(String(firstActive.id));
              }
            }
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchQuote();
  }, [token]);

  function updateField(setter, key, value) { setter(prev => ({ ...prev, [key]: value })); }

  const handleCreateOrder = async () => {
    try {
      setError('');

      if (!emailOk(billing.email)) throw new Error('Please enter a valid email');
      if (!isPhoneValid(billing.phone, billing.country)) throw new Error('Please enter a valid phone');
      
      const requiredBilling = ['full_name', 'address_line1', 'city', 'province_state', 'postal_code', 'country'];
      for (const k of requiredBilling) {
        if (!String(billing[k] || '').trim()) throw new Error('Please complete all required billing fields');
      }

      if (!selectedShipping) {
        throw new Error('Please select a shipping option');
      }

      let shippingPayload = null;
      if (requiresShippingAddress) {
        if (shipSame) {
          const { email: _e, ...copyBill } = billing;
          shippingPayload = copyBill;
        } else {
          const requiredShip = ['full_name', 'phone', 'address_line1', 'city', 'province_state', 'postal_code', 'country'];
          for (const k of requiredShip) {
            if (!String(shipping[k] || '').trim()) throw new Error('Please complete all required shipping fields');
          }
          shippingPayload = shipping;
        }
      }

      setProcessing(true);

      // Create order from quote
      const response = await fetch('/api/orders/create-from-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: quote.quote.quote_id,
          billing_address: billing,
          shipping_address: shippingPayload || billing,
          shipping_option_ids: [selectedShipping],
          user_id: quote.quote.user_id || null
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create order');
      }

      // Redirect to checkout with order ID
      router.push(`/checkout?order=${result.order.id}`);
    } catch (err) {
      setError(err.message);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Error</h1>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!quote) {
    return null;
  }

  const quoteData = quote.quote;
  const results = quote.quoteResults;
  const selectedShippingOption = shippingOptions.find(o => o.id === parseInt(selectedShipping));

  return (
    <>
      <Head>
        <title>Billing & Shipping - Quote #{quoteData?.quote_number}</title>
      </Head>

      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-gray-900">Billing & Shipping</h1>
            <p className="text-gray-600 text-sm mt-2">Quote #{quoteData?.quote_number}</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Billing Address Section */}
              <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing Address</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm text-gray-700">Full Name *</span>
                    <input value={billing.full_name} onChange={e=>updateField(setBilling,'full_name',e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                  </label>
                  <label className="block">
                    <span className="text-sm text-gray-700">Email *</span>
                    <input type="email" value={billing.email} onChange={e=>updateField(setBilling,'email',e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                  </label>
                  <div>
                    <PhoneInput required valueE164={billing.phone} onChangeE164={v=>updateField(setBilling,'phone',v||'')} defaultCountry={billing.country} />
                  </div>
                  <div />
                  <label className="block md:col-span-2">
                    <span className="text-sm text-gray-700">Address Line 1 *</span>
                    <input value={billing.address_line1} onChange={e=>updateField(setBilling,'address_line1',e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="text-sm text-gray-700">Address Line 2</span>
                    <input value={billing.address_line2} onChange={e=>updateField(setBilling,'address_line2',e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                  </label>
                  <label className="block">
                    <span className="text-sm text-gray-700">City *</span>
                    <input value={billing.city} onChange={e=>updateField(setBilling,'city',e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                  </label>
                  <div>
                    <RegionSelect required country={billing.country} value={billing.province_state} onChange={v=>updateField(setBilling,'province_state',v)} />
                  </div>
                  <label className="block">
                    <span className="text-sm text-gray-700">{labelForPostal(billing.country)} *</span>
                    <input value={billing.postal_code} onChange={e=>updateField(setBilling,'postal_code', formatPostal(billing.country, e.target.value))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                  </label>
                  <div>
                    <CountrySelect required autoDetect value={billing.country} onChange={v=>updateField(setBilling,'country',v)} />
                  </div>
                </div>
              </section>

              {/* Shipping Address Section */}
              <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h2>
                <label className="flex items-center gap-2 mb-4">
                  <input type="checkbox" checked={shipSame} onChange={e=>setShipSame(e.target.checked)} className="w-4 h-4" />
                  <span className="text-gray-700">Same as billing address</span>
                </label>

                {!shipSame && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm text-gray-700">Full Name *</span>
                      <input value={shipping.full_name} onChange={e=>updateField(setShipping,'full_name',e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                    </label>
                    <div>
                      <PhoneInput required valueE164={shipping.phone} onChangeE164={v=>updateField(setShipping,'phone',v||'')} defaultCountry={shipping.country} />
                    </div>
                    <label className="block md:col-span-2">
                      <span className="text-sm text-gray-700">Address Line 1 *</span>
                      <input value={shipping.address_line1} onChange={e=>updateField(setShipping,'address_line1',e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                    </label>
                    <label className="block md:col-span-2">
                      <span className="text-sm text-gray-700">Address Line 2</span>
                      <input value={shipping.address_line2} onChange={e=>updateField(setShipping,'address_line2',e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                    </label>
                    <label className="block">
                      <span className="text-sm text-gray-700">City *</span>
                      <input value={shipping.city} onChange={e=>updateField(setShipping,'city',e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                    </label>
                    <div>
                      <RegionSelect required country={shipping.country} value={shipping.province_state} onChange={v=>updateField(setShipping,'province_state',v)} />
                    </div>
                    <label className="block">
                      <span className="text-sm text-gray-700">{labelForPostal(shipping.country)} *</span>
                      <input value={shipping.postal_code} onChange={e=>updateField(setShipping,'postal_code', formatPostal(shipping.country, e.target.value))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                    </label>
                    <div>
                      <CountrySelect required autoDetect value={shipping.country} onChange={v=>updateField(setShipping,'country',v)} />
                    </div>
                  </div>
                )}
              </section>

              {/* Shipping Options Section */}
              <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Shipping Method</h2>
                <p className="text-xs text-gray-500 mb-6">Choose how you'd like to receive your documents</p>

                <div className="space-y-3">
                  {shippingOptions.filter(o => o.is_always_selected).map((option) => (
                    <div key={option.id} className="flex items-start gap-4 rounded-xl border-2 border-blue-400 bg-blue-50 p-4">
                      <input
                        type="checkbox"
                        checked
                        disabled
                        className="h-5 w-5 mt-0.5 cursor-not-allowed"
                      />
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between">
                          <h3 className="font-semibold text-gray-900">{option.name}</h3>
                          <span className="text-sm font-semibold text-gray-900">FREE</span>
                        </div>
                        {option.description && <p className="text-sm text-gray-600 mt-1">{option.description}</p>}
                        {option.delivery_time && <p className="text-xs text-gray-500 mt-1">Delivery: {option.delivery_time}</p>}
                      </div>
                    </div>
                  ))}

                  {shippingOptions.filter(o => !o.is_always_selected).length > 0 && (
                    <>
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-700 font-medium mb-4">Choose additional delivery method (optional):</p>

                        <div className="space-y-3">
                          {shippingOptions.filter(o => !o.is_always_selected).map((option) => {
                            const isDisabled = !option.is_active;
                            const isChecked = String(selectedShipping) === String(option.id);

                            return (
                              <label
                                key={option.id}
                                className={`flex items-start gap-4 rounded-xl border p-4 transition ${
                                  isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                } ${
                                  isChecked ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="physical_delivery"
                                  checked={isChecked}
                                  disabled={isDisabled}
                                  onChange={() => {
                                    if (!isDisabled) {
                                      setSelectedShipping(String(option.id));
                                    }
                                  }}
                                  className="h-5 w-5 mt-0.5"
                                />
                                <div className="flex-1">
                                  <div className="flex items-baseline justify-between">
                                    <h3 className={`font-semibold ${isDisabled ? 'text-gray-500' : 'text-gray-900'}`}>
                                      {option.name}
                                      {isDisabled && <span className="text-xs text-red-600 ml-2">(Unavailable)</span>}
                                    </h3>
                                    <span className="text-sm font-semibold text-gray-900 ml-4">
                                      {Number(option.price || 0) > 0 ? `$${Number(option.price).toFixed(2)}` : 'FREE'}
                                    </span>
                                  </div>
                                  {option.description && <p className="text-sm text-gray-600 mt-1">{option.description}</p>}
                                  {option.delivery_time && <p className="text-xs text-gray-500 mt-1">Delivery: {option.delivery_time}</p>}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </section>
            </div>

            {/* Right Column - Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden sticky top-6">
                <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 px-6 py-4">
                  <h3 className="text-white font-semibold text-lg">Order Summary</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-2 pb-4 border-b border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Quote Subtotal</span>
                      <span className="text-gray-900 font-medium">${Number(results?.subtotal || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pb-4 border-b border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Shipping</span>
                      <span className="text-gray-900 font-medium">
                        {selectedShippingOption ? `$${Number(selectedShippingOption.price || 0).toFixed(2)}` : '$0.00'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 pb-4 border-b border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-900 font-medium">${formatCurrency(grandSubtotal).replace('$', '')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax (5% GST)</span>
                      <span className="text-gray-900 font-medium">${formatCurrency(tax).replace('$', '')}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-cyan-600">${formatCurrency(grandTotal).replace('$', '')} CAD</span>
                  </div>

                  <button
                    onClick={handleCreateOrder}
                    disabled={processing}
                    className="w-full mt-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 font-semibold"
                  >
                    {processing ? 'Processing...' : 'Proceed to Payment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
