import { withApiBreadcrumbs } from '../../../lib/sentry';

function write405(res){ res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method Not Allowed' }); }

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

async function handler(req, res) {
  if (req.method !== 'POST') return write405(res);

  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) {
    return res.status(501).json({ error: 'Stripe not configured' });
  }

  const { default: Stripe } = await import('stripe');
  const stripe = new Stripe(secret);

  try {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'charge.refunded':
        await handleRefund(event.data.object);
        break;
      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}

import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { getOrderWithDetails } from '../orders/create-from-quote';
import { sendOrderConfirmationEmail, sendPaymentFailedEmail } from '../../../lib/email';

async function handlePaymentSuccess(paymentIntent){
  const orderId = paymentIntent?.metadata?.order_id;
  if (!orderId) return;
  const supabase = getSupabaseServerClient();
  await supabase.from('orders').update({
    status: 'paid',
    payment_status: 'succeeded',
    payment_intent_id: paymentIntent.id,
    transaction_id: paymentIntent.charges?.data?.[0]?.id || null,
    paid_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq('id', orderId);
  await supabase.from('order_status_history').insert([
    { order_id: orderId, from_status: 'pending_payment', to_status: 'paid', changed_by_type: 'payment_webhook', notes: 'Payment succeeded', metadata: { payment_intent_id: paymentIntent.id } }
  ]);

  const order = await getOrderWithDetails(supabase, orderId);
  if (order) {
    await sendOrderConfirmationEmail(order);
  }
}

async function handlePaymentFailed(paymentIntent){
  const orderId = paymentIntent?.metadata?.order_id;
  if (!orderId) return;
  const supabase = getSupabaseServerClient();
  await supabase.from('orders').update({
    status: 'payment_failed',
    payment_status: 'failed',
    payment_intent_id: paymentIntent.id,
    updated_at: new Date().toISOString()
  }).eq('id', orderId);
  await supabase.from('order_status_history').insert([
    { order_id: orderId, from_status: 'pending_payment', to_status: 'payment_failed', changed_by_type: 'payment_webhook', notes: `Payment failed: ${paymentIntent?.last_payment_error?.message || ''}`, metadata: { payment_intent_id: paymentIntent.id } }
  ]);

  const order = await getOrderWithDetails(supabase, orderId);
  if (order) {
    const msg = paymentIntent?.last_payment_error?.message || 'Payment declined';
    await sendPaymentFailedEmail(order, msg);
  }
}

async function handleRefund(charge){
  const paymentIntentId = charge?.payment_intent;
  if (!paymentIntentId) return;
  const supabase = getSupabaseServerClient();
  const { data: order } = await supabase.from('orders').select('*').eq('payment_intent_id', paymentIntentId).maybeSingle();
  if (!order) return;
  await supabase.from('orders').update({ status: 'refunded', payment_status: 'refunded', updated_at: new Date().toISOString() }).eq('id', order.id);
  await supabase.from('order_status_history').insert([
    { order_id: order.id, from_status: order.status, to_status: 'refunded', changed_by_type: 'payment_webhook', notes: 'Payment refunded', metadata: { charge_id: charge.id } }
  ]);
}

export default withApiBreadcrumbs(handler);

export const config = {
  api: {
    bodyParser: false,
  },
};
