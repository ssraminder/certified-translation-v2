import { getSupabaseServerClient } from '../../../lib/supabaseServer';

export default async function handler(req, res){
  if (req.method !== 'GET') { res.setHeader('Allow','GET'); return res.status(405).json({ error: 'Method Not Allowed' }); }
  const { quote_id, limit = 10 } = req.query || {};
  if (!quote_id) return res.status(400).json({ error: 'quote_id required' });
  const supabase = getSupabaseServerClient();

  const lim = Math.max(1, Math.min(Number(limit)||10, 50));
  const { data, error } = await supabase
    .from('analysis_runs')
    .select('id, version, status, is_active, discarded, created_at, updated_at')
    .eq('quote_id', quote_id)
    .order('created_at', { ascending: false })
    .limit(lim);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ runs: data || [] });
}
