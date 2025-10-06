import { withApiBreadcrumbs } from '../../../../lib/sentry';
import { withAdmin, withPermission } from '../../../../lib/apiAdmin';

async function handler(req, res) {
  const supabase = req.supabase;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('shipping_options')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ options: data || [] });
  }

  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      if (!body.name || body.price == null) return res.status(400).json({ error: 'Name and Price are required' });
      if (Number(body.price) < 0) return res.status(400).json({ error: 'Price must be non-negative' });

      if (body.is_always_selected) {
        await supabase.from('shipping_options').update({ is_always_selected: false }).eq('is_always_selected', true);
      }

      const { data, error } = await supabase
        .from('shipping_options')
        .insert([{
          name: body.name,
          description: body.description || null,
          price: Number(body.price) || 0,
          delivery_time: body.delivery_time || null,
          require_shipping_address: !!body.require_shipping_address,
          is_default: !!body.is_default,
          is_always_selected: !!body.is_always_selected,
          is_active: body.is_active !== false,
          sort_order: Number(body.sort_order) || 0
        }])
        .select('*')
        .single();
      if (error) throw error;
      return res.status(201).json({ option: data });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Unexpected error' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method Not Allowed' });
}

const guarded = withAdmin(async (req, res) => {
  if (req.method === 'GET') return handler(req, res);
  if (req.method === 'POST') return withPermission('settings', 'edit')(handler)(req, res);
  return handler(req, res);
});

export default withApiBreadcrumbs(withPermission('settings', 'view')(guarded));
