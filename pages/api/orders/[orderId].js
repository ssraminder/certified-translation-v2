import { withApiBreadcrumbs } from '../../../lib/sentry';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { getOrderWithDetails } from './create-from-quote';

async function handler(req, res) {
  const { orderId } = req.query;
  if (!orderId) return res.status(400).json({ error: 'Missing orderId' });

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabase = getSupabaseServerClient();
    const order = await getOrderWithDetails(supabase, orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    return res.status(200).json({ order });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}

export default withApiBreadcrumbs(handler);
