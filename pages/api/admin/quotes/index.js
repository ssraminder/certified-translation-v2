import { withPermission } from '../../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../../lib/supabaseServer';

function parseQuery(q){
  const page = Math.max(1, Number(q.page || 1));
  const limit = Math.min(100, Math.max(1, Number(q.limit || 20)));
  const search = (q.search || '').toString().trim();
  const status = (q.status || 'all').toString().trim().toLowerCase();
  return { page, limit, search, status };
}

async function handler(req, res){
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const supabase = getSupabaseServerClient();
  const { page, limit, search, status } = parseQuery(req.query || {});

  let query = supabase
    .from('quote_submissions')
    .select('quote_id, quote_number, quote_state, hitl_required, name, email, source_lang, target_lang, intended_use, created_at, expires_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status && status !== 'all') query = query.eq('quote_state', status);
  if (search) {
    const like = `%${search}%`;
    query = query.or(`quote_number.ilike.${like},name.ilike.${like},email.ilike.${like}`);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data: rows, count, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const ids = (rows || []).map(r => r.quote_id);
  let totalsMap = {};
  if (ids.length){
    const { data: results } = await supabase.from('quote_results').select('quote_id, total').in('quote_id', ids);
    for (const r of (results||[])) totalsMap[r.quote_id] = r.total;
  }

  const quotes = (rows || []).map(r => ({
    id: r.quote_id,
    order_id: r.quote_number || r.quote_id,
    quote_state: r.quote_state,
    hitl_required: !!r.hitl_required,
    customer_name: r.name || null,
    customer_email: r.email || null,
    source_language: r.source_lang || null,
    target_language: r.target_lang || null,
    intended_use: r.intended_use || null,
    created_at: r.created_at,
    expires_at: r.expires_at || null,
    total: typeof totalsMap[r.quote_id] === 'number' ? totalsMap[r.quote_id] : null
  }));

  const pages = Math.ceil((count || 0)/limit) || 1;
  return res.status(200).json({ quotes, total_count: count || 0, page, pages });
}

export default withPermission('quotes','view')(handler);
