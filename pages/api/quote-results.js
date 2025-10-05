import { getSupabaseServerClient } from '../../lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const quote = req.query.quote;
  if (!quote) return res.status(400).json({ error: 'Missing quote' });
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('quote_results')
      .select('subtotal, tax, total, shipping_total')
      .eq('quote_id', quote)
      .maybeSingle();
    if (error) throw error;
    return res.status(200).json(data || {});
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}
