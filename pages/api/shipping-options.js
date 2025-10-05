import { withApiBreadcrumbs } from '../../lib/sentry';
import { getSupabaseServerClient } from '../../lib/supabaseServer';

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('shipping_options')
      .select('id, name, description, price, require_shipping_address, is_default, is_always_selected, is_active, delivery_time, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (error) throw error;

    return res.status(200).json({ options: data || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}

export default withApiBreadcrumbs(handler);
