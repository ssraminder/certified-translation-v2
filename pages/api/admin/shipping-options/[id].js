import { getSupabaseServerClient } from '../../../../lib/supabaseServer';

export default async function handler(req, res) {
  const { id } = req.query;
  const supabase = getSupabaseServerClient();

  if (req.method === 'PUT') {
    try {
      const body = req.body || {};
      if (body.price != null && Number(body.price) < 0) return res.status(400).json({ error: 'Price must be non-negative' });

      if (body.is_always_selected) {
        // Ensure only one always selected
        await supabase.from('shipping_options').update({ is_always_selected: false }).eq('is_always_selected', true).neq('id', id);
      }

      const fields = {};
      const allowed = ['name','description','price','delivery_time','require_shipping_address','is_default','is_always_selected','is_active','sort_order'];
      for (const k of allowed) if (k in body) fields[k] = body[k];

      const { data, error } = await supabase
        .from('shipping_options')
        .update(fields)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return res.status(200).json({ option: data });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Unexpected error' });
    }
  }

  if (req.method === 'DELETE') {
    // Prevent deleting always-selected
    const { data: row } = await supabase.from('shipping_options').select('is_always_selected').eq('id', id).maybeSingle();
    if (row?.is_always_selected) return res.status(400).json({ error: 'Cannot delete an always-selected option' });
    const { error } = await supabase.from('shipping_options').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  res.setHeader('Allow', 'PUT, DELETE');
  return res.status(405).json({ error: 'Method Not Allowed' });
}
