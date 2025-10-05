import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { getOrderWithDetails } from '../orders/create-from-quote';
import { sendOrderConfirmationEmail } from '../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not allowed in production' });
  }

  try {
    const { order_id } = req.body || {};
    if (!order_id) return res.status(400).json({ error: 'order_id required' });

    const supabase = getSupabaseServerClient();
    const order = await getOrderWithDetails(supabase, order_id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const result = await sendOrderConfirmationEmail(order);
    return res.status(200).json({ success: true, result });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unexpected error' });
  }
}
