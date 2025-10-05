import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function OrderConfirmation(){
  const router = useRouter();
  const { order_id, redirect_status } = router.query || {};
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!order_id) return;
    let isMounted = true;
    (async () => {
      try {
        const resp = await fetch(`/api/orders/${order_id}`);
        const json = await resp.json();
        if (!resp.ok) throw new Error(json.error || 'Failed to load order');
        if (isMounted) setOrder(json.order);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [order_id]);

  if (loading) return <div className="mx-auto max-w-md p-8">Loading...</div>;

  if (!order || redirect_status !== 'succeeded') {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-md px-4 py-12 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Payment Failed</h1>
          <p className="text-gray-700 mb-6">There was an issue processing your payment. Please try again.</p>
          <button className="rounded-lg bg-cyan-600 px-5 py-2 text-white" onClick={()=>router.push(`/checkout?order=${order_id}`)}>Retry Payment</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">✓</div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Order Confirmed!</h1>
        <p className="text-gray-700 mb-6">
          Thank you for your order. We've sent a confirmation email to{' '}
          <strong>{order?.billing_address?.email || order?.customer_email}</strong>
        </p>
        <div className="bg-white border border-gray-100 rounded-xl p-5 text-left mb-6">
          <div className="flex items-center justify-between text-sm mb-2"><span className="text-gray-600">Order Number</span><span className="font-medium text-gray-900">{order.order_number}</span></div>
          <div className="flex items-center justify-between text-sm mb-2"><span className="text-gray-600">Total Paid</span><span className="font-medium text-gray-900">${Number(order.total||0).toFixed(2)} CAD</span></div>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button className="rounded-lg bg-cyan-600 px-5 py-2 text-white" onClick={()=>router.push('/')}>Return Home</button>
        </div>
      </div>
    </div>
  );
}
