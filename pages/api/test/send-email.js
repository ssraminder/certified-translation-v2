import { withApiBreadcrumbs } from '../../../lib/sentry';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { getOrderWithDetails } from '../orders/create-from-quote';
import { sendOrderConfirmationEmail } from '../../../lib/email';

function isUuid(v){
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

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
      if (!order_id) return res.status(400).json({ error: 'order_id required (UUID or order number like ORD-YYYY-NNNNNN)' });
      let idToFetch = order_id;
      if (!isUuid(order_id)) {
        const { data: byNumber, error: numErr } = await supabase
          .from('orders')
          .select('id')
          .eq('order_number', order_id)
          .maybeSingle();
        if (numErr) throw numErr;
        if (!byNumber) return res.status(404).json({ error: 'Order not found by order_number' });
        idToFetch = byNumber.id;
      }
      order = await getOrderWithDetails(supabase, idToFetch);
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
