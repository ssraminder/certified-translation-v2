import { withApiBreadcrumbs } from '../../../lib/sentry';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { getOrderWithDetails } from '../orders/create-from-quote';
import { sendOrderConfirmationEmail } from '../../../lib/email';

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { order_id, use_latest_paid, recipient } = req.body || {};
    const supabase = getSupabaseServerClient();

    let order;
    if (use_latest_paid) {
      const { data: latest, error: qErr } = await supabase
        .from('orders')
        .select('id')
        .eq('status', 'paid')
        .order('paid_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (qErr) throw qErr;
      if (!latest) return res.status(404).json({ error: 'No paid orders found' });
      order = await getOrderWithDetails(supabase, latest.id);
    } else {
      if (!order_id) return res.status(400).json({ error: 'order_id required' });
      order = await getOrderWithDetails(supabase, order_id);
    }

    if (!order) return res.status(404).json({ error: 'Order not found' });

    const override = { ...order };
    if (recipient) {
      override.customer_email = recipient;
      if (override.billing_address) {
        override.billing_address = { ...override.billing_address, email: recipient };
      }
    }

    const result = await sendOrderConfirmationEmail(override);
    return res.status(200).json({ success: true, result, order_id: override.id });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unexpected error' });
  }
}

export default withApiBreadcrumbs(handler);
