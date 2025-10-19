import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Spinner from '../components/dashboard/Spinner';
import AddressFormModal from '../components/dashboard/AddressFormModal';

export default function QuoteCheckoutPage() {
  const router = useRouter();
  const { token } = router.query;

  const [quote, setQuote] = useState(null);
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [billingAddress, setBillingAddress] = useState(null);
  const [shippingAddress, setShippingAddress] = useState(null);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [showBillingForm, setShowBillingForm] = useState(false);
  const [showShippingForm, setShowShippingForm] = useState(false);

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

        // Fetch available shipping options
        const shippingRes = await fetch('/api/shipping-options');
        const shippingData = await shippingRes.json();
        if (shippingData.options) {
          setShippingOptions(shippingData.options);
          // Auto-select always-selected option, or first available option
          if (shippingData.options.length > 0) {
            const alwaysSelected = shippingData.options.find(o => o.is_always_selected);
            const firstActive = shippingData.options.find(o => o.is_active);
            const defaultOption = alwaysSelected || firstActive || shippingData.options[0];
            setSelectedShipping(defaultOption.id);
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

  const handleCreateOrder = async () => {
    if (!billingAddress) {
      setError('Please provide a billing address');
      return;
    }
    if (!selectedShipping) {
      setError('Please select a shipping option');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      // Create order from quote
      const response = await fetch('/api/orders/create-from-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: quote.quote.quote_id,
          billing_address: billingAddress,
          shipping_address: sameAsShipping ? billingAddress : shippingAddress,
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
  const selectedShippingOption = shippingOptions.find(o => o.id === selectedShipping);

  return (
    <>
      <Head>
        <title>Checkout - Quote #{quoteData?.quote_number}</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <h2 className="text-white font-semibold text-lg">Billing Address</h2>
                </div>
                <div className="p-6">
                  {billingAddress ? (
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="font-medium text-gray-900">{billingAddress.full_name}</p>
                        <p className="text-sm text-gray-600">{billingAddress.email}</p>
                        <p className="text-sm text-gray-600">{billingAddress.phone}</p>
                        <p className="text-sm text-gray-600">{billingAddress.address_line1}</p>
                        {billingAddress.address_line2 && <p className="text-sm text-gray-600">{billingAddress.address_line2}</p>}
                        <p className="text-sm text-gray-600">{billingAddress.city}, {billingAddress.province_state} {billingAddress.postal_code}</p>
                        <p className="text-sm text-gray-600">{billingAddress.country}</p>
                      </div>
                      <button
                        onClick={() => setShowBillingForm(true)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                      >
                        Change Address
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowBillingForm(true)}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      + Add Billing Address
                    </button>
                  )}
                </div>
              </div>

              {/* Shipping Address Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <h2 className="text-white font-semibold text-lg">Shipping Address</h2>
                </div>
                <div className="p-6">
                  <div className="mb-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={sameAsShipping}
                        onChange={(e) => setSameAsShipping(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-700">Same as billing address</span>
                    </label>
                  </div>

                  {!sameAsShipping && (
                    <>
                      {shippingAddress ? (
                        <div className="space-y-3">
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <p className="font-medium text-gray-900">{shippingAddress.full_name}</p>
                            <p className="text-sm text-gray-600">{shippingAddress.email}</p>
                            <p className="text-sm text-gray-600">{shippingAddress.phone}</p>
                            <p className="text-sm text-gray-600">{shippingAddress.address_line1}</p>
                            {shippingAddress.address_line2 && <p className="text-sm text-gray-600">{shippingAddress.address_line2}</p>}
                            <p className="text-sm text-gray-600">{shippingAddress.city}, {shippingAddress.province_state} {shippingAddress.postal_code}</p>
                            <p className="text-sm text-gray-600">{shippingAddress.country}</p>
                          </div>
                          <button
                            onClick={() => setShowShippingForm(true)}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                          >
                            Change Address
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowShippingForm(true)}
                          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                          + Add Shipping Address
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Shipping Options Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <h2 className="text-white font-semibold text-lg">Shipping Options</h2>
                </div>
                <div className="p-6 space-y-3">
                  {shippingOptions.length === 0 ? (
                    <p className="text-gray-600 text-sm">No shipping options available</p>
                  ) : (
                    shippingOptions.map((option) => {
                      const isAlwaysSelected = option.is_always_selected;
                      const isDisabledOption = !option.is_active;
                      const isChecked = selectedShipping === option.id;
                      return (
                        <label
                          key={option.id}
                          className={`flex items-start gap-3 p-4 border rounded-lg transition ${
                            isDisabledOption ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                          } ${
                            isChecked
                              ? 'border-blue-300 bg-blue-50'
                              : 'border-gray-200 bg-white hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="shipping"
                            value={option.id}
                            checked={isChecked}
                            disabled={isDisabledOption}
                            onChange={(e) => {
                              if (!isDisabledOption) {
                                setSelectedShipping(e.target.value);
                              }
                            }}
                            className="w-4 h-4 mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`font-medium ${isDisabledOption ? 'text-gray-500' : 'text-gray-900'}`}>{option.name}</p>
                              {isAlwaysSelected && <span className="text-xs text-gray-500">(Always included)</span>}
                              {isDisabledOption && <span className="text-xs text-red-600">(Disabled)</span>}
                            </div>
                            {option.description && <p className="text-sm text-gray-600">{option.description}</p>}
                            {option.delivery_time && <p className="text-sm text-gray-600">Delivery: {option.delivery_time}</p>}
                          </div>
                          <p className={`font-semibold whitespace-nowrap ${isDisabledOption ? 'text-gray-500' : 'text-gray-900'}`}>
                            {Number(option.price || 0) > 0 ? `$${Number(option.price).toFixed(2)}` : 'FREE'}
                          </p>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden sticky top-6">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
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
                      <span className="text-gray-900 font-medium">
                        ${(Number(results?.subtotal || 0) + Number(selectedShippingOption?.price || 0)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax (5% GST)</span>
                      <span className="text-gray-900 font-medium">
                        ${((Number(results?.subtotal || 0) + Number(selectedShippingOption?.price || 0)) * 0.05).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ${((Number(results?.subtotal || 0) + Number(selectedShippingOption?.price || 0)) * 1.05).toFixed(2)} CAD
                    </span>
                  </div>

                  <button
                    onClick={handleCreateOrder}
                    disabled={!billingAddress || !selectedShipping || processing}
                    className="w-full mt-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
                  >
                    {processing ? 'Processing...' : 'Proceed to Payment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddressFormModal
        isOpen={showBillingForm}
        onClose={() => setShowBillingForm(false)}
        onSave={(address) => {
          setBillingAddress(address);
          setShowBillingForm(false);
        }}
      />

      <AddressFormModal
        isOpen={showShippingForm}
        onClose={() => setShowShippingForm(false)}
        onSave={(address) => {
          setShippingAddress(address);
          setShowShippingForm(false);
        }}
      />
    </>
  );
}
