import { getSupabaseServerClient } from '../../../../lib/supabaseServer';

export default async function handler(req, res) {
  const { orderId, filter = 'all' } = req.query;

  if (!orderId) {
    return res.status(400).json({ error: 'Missing orderId' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabase = getSupabaseServerClient();

    let query = supabase
      .from('order_activity')
      .select('*')
      .eq('order_id', orderId);

    if (filter !== 'all') {
      query = query.eq('type', filter);
    }

    const { data: activities, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ activities: activities || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}
