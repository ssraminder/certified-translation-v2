import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import styles from '../styles/checkout.module.css';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function CheckoutForm({ order }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
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
    <form onSubmit={handleSubmit} className="checkout-form">
      <div className={styles.paymentElementContainer}>
        <h2>Payment Method</h2>
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className={styles.errorMessage}>❌ {errorMessage}</div>
      )}

      <div className={styles.termsAcceptance}>
        <label>
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
          />
          <span>
            I agree to the <a href="/terms" target="_blank" rel="noreferrer">Terms of Service</a> and{' '}
            <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>
          </span>
        </label>
      </div>

      <button type="submit" disabled={!stripe || isProcessing || !termsAccepted} className={styles.payButton}>
        {isProcessing ? (<><span className={styles.spinner}></span> Processing...</>) : (<>🔒 Pay ${order.total?.toFixed(2)} Now</>)}
      </button>

      <p className={styles.securityNote}>
        🔒 Secure payment powered by Stripe<br />
        Your payment information is encrypted and secure
      </p>
    </form>
  );
}

function AddressDisplay({ address }) {
  if (!address) return null;
  return (
    <div className={styles.addressDisplay}>
      <div>{address.full_name}</div>
      {address.email && <div>{address.email}</div>}
      <div>{address.phone}</div>
      <div>{address.address_line1}</div>
      {address.address_line2 && <div>{address.address_line2}</div>}
      <div>{address.city}, {address.province_state} {address.postal_code}</div>
      <div>{address.country}</div>
    </div>
  );
}

function PriceSummary({ order }) {
  return (
    <div className={styles.priceSummary}>
      <h3>Payment Summary</h3>
      <div className={styles.priceLine}><span>Translation</span><span>${Number(order.translation_total||0).toFixed(2)}</span></div>
      <div className={styles.priceLine}><span>Certification</span><span>${Number(order.certification_total||0).toFixed(2)}</span></div>
      <div className={styles.priceLine}><span>Delivery</span><span>${Number(order.delivery_total||0).toFixed(2)}</span></div>
      <div className={styles.priceLine}><span>Shipping</span><span>${Number(order.shipping_total||0).toFixed(2)}</span></div>
      <div className={styles.priceDivider}></div>
      <div className={styles.priceLine}><span>Subtotal</span><span>${Number(order.subtotal||0).toFixed(2)}</span></div>
      <div className={styles.priceLine}><span>GST ({Number(order.tax_rate||0)*100}%)</span><span>${Number(order.tax_total||0).toFixed(2)}</span></div>
      <div className={styles.priceDivider}></div>
      <div className={`${styles.priceLine} ${styles.total}`}><span>Total</span><span>${Number(order.total||0).toFixed(2)}</span></div>
    </div>
  );
}

function OrderSummary({ order, onEdit }) {
  const router = useRouter();
  return (
    <div className={styles.orderSummary}>
      <h2>Order Summary</h2>

      <div className={styles.summarySection}>
        <div className={styles.sectionHeader}>
          <h3>Documents ({order.documents?.length || 0})</h3>
          <button className={styles.editLink} onClick={() => router.push(`/order/step-2?quote=${order.quote_id}`)}>Edit</button>
        </div>
        <div className="section-content">
          {(order.documents||[]).map((doc, idx) => (
            <div key={doc.id || idx} className="document-item">
              <div>
                <div className="doc-name">{doc.filename || 'Document'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.summarySection}>
        <div className={styles.sectionHeader}>
          <h3>Shipping</h3>
          <button className={styles.editLink} onClick={() => router.push(`/order/step-4?quote=${order.quote_id}`)}>Edit</button>
        </div>
        <div className="section-content">
          {(order.shipping_options||[]).map((option) => (
            <div key={option.id} className="shipping-item">
              <div className="shipping-name">
                {option.name}
                {option.delivery_time && <span className="shipping-time"> {option.delivery_time}</span>}
              </div>
              <div className="shipping-price">{Number(option.price||0) > 0 ? `$${Number(option.price||0).toFixed(2)}` : 'FREE'}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.summarySection}>
        <div className={styles.sectionHeader}>
          <h3>Billing Address</h3>
          <button className={styles.editLink} onClick={() => router.push(`/order/step-4?quote=${order.quote_id}`)}>Edit</button>
        </div>
        <div className="section-content">
          <AddressDisplay address={order.billing_address} />
        </div>
      </div>

      {order.shipping_address && order.shipping_address.id !== order.billing_address?.id && (
        <div className={styles.summarySection}>
          <div className={styles.sectionHeader}>
            <h3>Shipping Address</h3>
            <button className={styles.editLink} onClick={() => router.push(`/order/step-4?quote=${order.quote_id}`)}>Edit</button>
          </div>
          <div className="section-content">
            <AddressDisplay address={order.shipping_address} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { order: orderId } = router.query;

  const [order, setOrder] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!orderId) return;
      try {
        const resp = await fetch(`/api/orders/${orderId}`);
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Failed to load order');
        setOrder(data.order);

        // Create payment intent
        const pay = await fetch('/api/payment/create-intent', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
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

  const stripeOptions = useMemo(() => ({
    clientSecret,
    appearance: { theme: 'stripe', variables: { colorPrimary: '#5cb3cc' } }
  }), [clientSecret]);

  if (loading || !order) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading checkout...</p>
      </div>
    );
  }

  return (
    <div className={styles.checkoutPage}>
      <div className={styles.checkoutContainer}>
        <h1>Checkout</h1>
        <div className={styles.orderSummarySection}>
          <OrderSummary order={order} />
        </div>
        <div className={styles.paymentSection}>
          {clientSecret && (
            <Elements stripe={stripePromise} options={stripeOptions}>
              <CheckoutForm order={order} />
            </Elements>
          )}
        </div>
      </div>
      <div className={styles.checkoutSidebar}>
        <PriceSummary order={order} />
      </div>
    </div>
  );
}
