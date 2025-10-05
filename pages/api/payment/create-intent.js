import { withApiBreadcrumbs } from '../../../lib/sentry';

async function handler(req, res){
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({ error: 'Method Not Allowed' }); }
  const secret = process.env.STRIPE_SECRET_KEY;
  const publishable = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!secret || !publishable) return res.status(501).json({ error: 'Stripe not configured' });

  const { order_id, amount, currency = 'cad' } = req.body || {};
  if (!order_id || !Number.isFinite(Number(amount))) return res.status(400).json({ error: 'order_id and amount are required' });

  const { default: Stripe } = await import('stripe');
  const stripe = new Stripe(secret);

  try {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount) * 100),
      currency,
      metadata: { order_id },
      automatic_payment_methods: { enabled: true }
    });
    return res.status(200).json({ clientSecret: intent.client_secret });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create payment intent' });
  }
}

export default withApiBreadcrumbs(handler);
