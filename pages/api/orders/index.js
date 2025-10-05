import { getSupabaseServerClient } from '../../../lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const supabase = getSupabaseServerClient();
    const { user_id, status, limit = 20, offset = 0 } = req.query;

    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10) - 1);

    if (user_id) query = query.eq('user_id', user_id);
    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    return res.status(200).json({ orders: data || [], total: count || 0, limit: Number(limit), offset: Number(offset) });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}
