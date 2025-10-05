import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function CheckoutForm({ orderId }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError('');
    setIsProcessing(true);
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/?payment=completed&order=${orderId}`
      }
    });
    if (confirmError) {
      setError(confirmError.message || 'Payment failed');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-4">
      <PaymentElement />
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full rounded-md bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-700 disabled:opacity-50"
      >
        {isProcessing ? 'Processing…' : 'Pay Now'}
      </button>
    </form>
  );
}

export default function PaymentPage() {
  const router = useRouter();
  const { order, client_secret } = router.query;
  const options = useMemo(() => ({ clientSecret: client_secret }), [client_secret]);

  if (!client_secret) {
    return <div className="mx-auto max-w-md p-8">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-semibold text-gray-900">Checkout</h1>
        <Elements stripe={stripePromise} options={options}>
          <CheckoutForm orderId={order} />
        </Elements>
      </div>
    </div>
  );
}
