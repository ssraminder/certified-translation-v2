import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import AddressDisplay from '../components/checkout/AddressDisplay';
import OrderSummaryCard from '../components/checkout/OrderSummaryCard';
import PricingBreakdown from '../components/checkout/PricingBreakdown';
import { formatBytes, round2, GST_RATE } from '../lib/checkoutUtils';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function CheckoutSteps({ currentStep = 2 }) {
  const steps = [
    { number: 1, label: 'Order Details', completed: true },
    { number: 2, label: 'Payment', completed: false },
    { number: 3, label: 'Confirmation', completed: false }
  ];

  return (
    <div className="flex items-center justify-center gap-4 mb-8">
      {steps.map((step, idx) => (
        <div key={step.number} className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-normal ${
                step.number < currentStep
                  ? 'bg-blue-600 text-white'
                  : step.number === currentStep
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}
            >
              {step.number < currentStep ? '✓' : step.number}
            </div>
            <span
              className={`text-sm ${
                step.number === currentStep
                  ? 'text-blue-600'
                  : step.number < currentStep
                  ? 'text-gray-700'
                  : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && <div className="w-12 h-px bg-gray-300"></div>}
        </div>
      ))}
    </div>
  );
}

function CheckoutForm({ order, termsAccepted, setTermsAccepted, isProcessing, setIsProcessing }) {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (!termsAccepted) {
      setErrorMessage('Please accept the terms and conditions');
      return;
    }
    setIsProcessing(true);
    setErrorMessage('');

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order-confirmation?order_id=${order.id}`,
      },
    });

    if (error) {
      setErrorMessage(error.message || 'Payment failed');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-xl font-normal text-gray-900 mb-6">Payment Method</h2>

        <div className="mt-6">
          <PaymentElement />
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">
              I agree to the{' '}
              <a href="/terms" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
            </span>
          </label>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing || !termsAccepted}
        className="hidden"
      >
        {isProcessing ? 'Processing...' : `Pay Now`}
      </button>
    </form>
  );
}


function CheckoutPageContent({ order, clientSecret, stripeOptions, isProcessing, termsAccepted, setIsProcessing, setTermsAccepted }) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (!termsAccepted) {
      alert('Please accept the terms and conditions');
      return;
    }
    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order-confirmation?order_id=${order.id}`,
      },
    });

    if (error) {
      alert(error.message || 'Payment failed');
      setIsProcessing(false);
    }
  };

  const quote = order.quote || {};
  const totalService = Number(order.translation_total || 0) + Number(order.certification_total || 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-gray-600" viewBox="0 0 16 16" fill="none">
              <path d="M12.6667 7.33334H3.33333C2.59695 7.33334 2 7.93029 2 8.66667V13.3333C2 14.0697 2.59695 14.6667 3.33333 14.6667H12.6667C13.403 14.6667 14 14.0697 14 13.3333V8.66667C14 7.93029 13.403 7.33334 12.6667 7.33334Z" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.66667 7.33334V4.66667C4.66667 3.78261 5.01786 2.93477 5.64298 2.30965C6.2681 1.68453 7.11595 1.33334 8 1.33334C8.88406 1.33334 9.7319 1.68453 10.357 2.30965C10.9821 2.93477 11.3333 3.78261 11.3333 4.66667V7.33334" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-sm text-gray-600">Secure Checkout</span>
          </div>
          <h1 className="text-3xl font-normal text-gray-900">Checkout</h1>
        </div>

        <CheckoutSteps currentStep={2} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <OrderSummaryCard order={order} quote={quote} />
              <button
                onClick={() => router.push(`/order/step-2?quote=${order.quote_id}`)}
                className="text-sm text-blue-600 hover:underline mt-2 ml-6"
              >
                Edit Order
              </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-600" viewBox="0 0 20 20" fill="none">
                  <path d="M11.6667 15V4.99998C11.6667 4.55795 11.4911 4.13403 11.1785 3.82147C10.866 3.50891 10.442 3.33331 10 3.33331H3.33333C2.89131 3.33331 2.46738 3.50891 2.15482 3.82147C1.84226 4.13403 1.66667 4.55795 1.66667 4.99998V14.1666C1.66667 14.3877 1.75447 14.5996 1.91075 14.7559C2.06703 14.9122 2.27899 15 2.5 15H4.16667M12.5 15H7.5M15.8333 15H17.5C17.721 15 17.933 14.9122 18.0893 14.7559C18.2455 14.5997 18.3333 14.3877 18.3333 14.1667V11.125C18.333 10.9359 18.2683 10.7525 18.15 10.605L15.25 6.98002C15.1721 6.88242 15.0732 6.80359 14.9607 6.74935C14.8482 6.69512 14.7249 6.66687 14.6 6.66669H11.6667M14.1667 16.6666C15.0871 16.6666 15.8333 15.9205 15.8333 15C15.8333 14.0795 15.0871 13.3333 14.1667 13.3333C13.2462 13.3333 12.5 14.0795 12.5 15C12.5 15.9205 13.2462 16.6666 14.1667 16.6666ZM5.83333 16.6666C6.75381 16.6666 7.5 15.9205 7.5 15C7.5 14.0795 6.75381 13.3333 5.83333 13.3333C4.91286 13.3333 4.16667 14.0795 4.16667 15C4.16667 15.9205 4.91286 16.6666 5.83333 16.6666Z" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div className="flex-1">
                  <div className="text-base font-normal text-gray-900">Courier (Trackable)</div>
                  <div className="text-sm text-gray-600">2-3 business days</div>
                  <div className="text-xs text-gray-500">Estimated delivery: {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}</div>
                </div>
                <div className="text-base text-gray-900">${Number(order.shipping_total || 0).toFixed(2)}</div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" viewBox="0 0 20 20" fill="none">
                    <path d="M15.8333 17.5V15.8333C15.8333 14.9493 15.4821 14.1014 14.857 13.4763C14.2319 12.8512 13.3841 12.5 12.5 12.5H7.5C6.61595 12.5 5.7681 12.8512 5.14298 13.4763C4.51786 14.1014 4.16667 14.9493 4.16667 15.8333V17.5M10 9.16667C11.841 9.16667 13.3333 7.67428 13.3333 5.83333C13.3333 3.99238 11.841 2.5 10 2.5C8.15905 2.5 6.66667 3.99238 6.66667 5.83333C6.66667 7.67428 8.15905 9.16667 10 9.16667Z" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <h2 className="text-xl font-normal text-gray-900">Billing Address</h2>
                </div>
                <button
                  onClick={() => router.push(`/order/step-4?quote=${order.quote_id}`)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Edit
                </button>
              </div>
              <AddressDisplay address={order.billing_address} showEmail showPhone />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" viewBox="0 0 20 20" fill="none">
                    <path d="M16.6667 8.33335C16.6667 12.4942 12.0508 16.8275 10.5008 18.1659C10.3564 18.2744 10.1807 18.3331 10 18.3331C9.81933 18.3331 9.64356 18.2744 9.49917 18.1659C7.94917 16.8275 3.33333 12.4942 3.33333 8.33335C3.33333 6.56524 4.03571 4.86955 5.28595 3.61931C6.5362 2.36907 8.23189 1.66669 10 1.66669C11.7681 1.66669 13.4638 2.36907 14.714 3.61931C15.9643 4.86955 16.6667 6.56524 16.6667 8.33335Z" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 10.8333C11.3807 10.8333 12.5 9.71402 12.5 8.33331C12.5 6.9526 11.3807 5.83331 10 5.83331C8.61929 5.83331 7.5 6.9526 7.5 8.33331C7.5 9.71402 8.61929 10.8333 10 10.8333Z" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <h2 className="text-xl font-normal text-gray-900">Shipping Address</h2>
                </div>
                <button
                  onClick={() => router.push(`/order/step-4?quote=${order.quote_id}`)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Edit
                </button>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 mb-4">
                <input
                  type="checkbox"
                  checked={!order.shipping_address || order.shipping_address.id === order.billing_address?.id}
                  readOnly
                  className="w-4 h-4 rounded border-gray-900 bg-gray-900 text-white"
                />
                <span>Same as billing address</span>
              </label>
              {order.shipping_address && order.shipping_address.id !== order.billing_address?.id && (
                <div className="pl-6 border-l-2 border-gray-200">
                  <AddressDisplay address={order.shipping_address} />
                </div>
              )}
              {(!order.shipping_address || order.shipping_address.id === order.billing_address?.id) && order.billing_address && (
                <div className="pl-6 border-l-2 border-gray-200">
                  <AddressDisplay address={order.billing_address} />
                </div>
              )}
            </div>

            {clientSecret && (
              <Elements stripe={stripePromise} options={stripeOptions}>
                <CheckoutForm order={order} termsAccepted={termsAccepted} setTermsAccepted={setTermsAccepted} isProcessing={isProcessing} setIsProcessing={setIsProcessing} />
              </Elements>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border-2 border-gray-300 p-6 shadow-md sticky top-8">
              <h2 className="text-xl font-normal text-gray-900 mb-6">Payment Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-start pb-4 border-b border-gray-300">
                  <div>
                    <div className="text-base text-gray-900">Certified Translation Service</div>
                    <div className="text-sm text-gray-600">{quote.source_lang} to {quote.target_lang}</div>
                  </div>
                  <div className="text-base text-gray-900">${totalService.toFixed(2)}</div>
                </div>

                <PricingBreakdown
                  subtotal={Number(order.subtotal || 0) - Number(order.shipping_total || 0)}
                  shipping={Number(order.shipping_total || 0)}
                  taxRate={Number(order.tax_rate || 0)}
                  showShipping={true}
                />
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={!stripe || !elements || isProcessing || !termsAccepted}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-lg shadow-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isProcessing ? 'Processing...' : `Pay $${Number(order.total || 0).toFixed(2)}`}
              </button>

              <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" viewBox="0 0 17 16" fill="none">
                      <path d="M13.9349 8.6667C13.9349 12 11.6016 13.6667 8.82825 14.6334C8.68302 14.6826 8.52527 14.6802 8.38158 14.6267C5.60158 13.6667 3.26825 12 3.26825 8.6667V4.00004C3.26825 3.82322 3.33849 3.65366 3.46351 3.52863C3.58854 3.40361 3.75811 3.33337 3.93492 3.33337C5.26825 3.33337 6.93492 2.53337 8.09492 1.52004C8.23615 1.39937 8.41582 1.33307 8.60158 1.33307C8.78735 1.33307 8.96701 1.39937 9.10825 1.52004C10.2749 2.54004 11.9349 3.33337 13.2682 3.33337C13.4451 3.33337 13.6146 3.40361 13.7397 3.52863C13.8647 3.65366 13.9349 3.82322 13.9349 4.00004V8.6667Z" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>SSL Secure</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" viewBox="0 0 17 16" fill="none">
                      <path d="M13.2214 7.33331H3.88802C3.15164 7.33331 2.55469 7.93027 2.55469 8.66665V13.3333C2.55469 14.0697 3.15164 14.6666 3.88802 14.6666H13.2214C13.9577 14.6666 14.5547 14.0697 14.5547 13.3333V8.66665C14.5547 7.93027 13.9577 7.33331 13.2214 7.33331ZM5.22137 7.33331V4.66665C5.22137 3.78259 5.57256 2.93475 6.19769 2.30962C6.82281 1.6845 7.67065 1.33331 8.55471 1.33331C9.43876 1.33331 10.2866 1.6845 10.9117 2.30962C11.5369 2.93475 11.888 3.78259 11.888 4.66665V7.33331" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Encrypted</span>
                  </div>
                </div>
                
                <div className="text-center text-xs text-gray-500">Powered by Stripe</div>
                
                <div className="flex items-center justify-center gap-3">
                  {['VISA', 'Mastercard', 'AMEX', 'Discover'].map((brand) => (
                    <div key={brand} className="px-2 py-1 text-xs text-gray-400 border border-gray-300 rounded">
                      {brand}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { order: orderId } = router.query;

  const [order, setOrder] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!orderId) return;
      try {
        const resp = await fetch(`/api/orders/${orderId}`);
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Failed to load order');
        setOrder(data.order);

        const pay = await fetch('/api/payment/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId, amount: data.order.total, currency: 'cad' })
        });
        const payJson = await pay.json();
        if (!pay.ok) throw new Error(payJson.error || 'Failed to initialize payment');
        setClientSecret(payJson.clientSecret);
      } catch (err) {
        console.error(err);
        alert('Failed to load checkout. Please try again.');
        router.push('/');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [orderId, router]);

  const stripeOptions = useMemo(
    () => ({
      clientSecret,
      appearance: {
        theme: 'stripe',
        variables: { colorPrimary: '#155DFC' }
      }
    }),
    [clientSecret]
  );

  if (loading || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={stripeOptions}>
      <CheckoutPageContent
        order={order}
        clientSecret={clientSecret}
        stripeOptions={stripeOptions}
        isProcessing={isProcessing}
        termsAccepted={termsAccepted}
        setIsProcessing={setIsProcessing}
        setTermsAccepted={setTermsAccepted}
      />
    </Elements>
  );
}
