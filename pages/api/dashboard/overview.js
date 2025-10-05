import { getSupabaseServerClient } from '../../../lib/supabaseServer';

function parseCookies(cookieHeader){
  const out = {}; if (!cookieHeader) return out; const parts = cookieHeader.split(';');
  for (const p of parts){ const [k, ...v] = p.trim().split('='); out[k] = decodeURIComponent(v.join('=')); }
  return out;
}

export default async function handler(req, res){
  try {
    const cookies = parseCookies(req.headers.cookie || '');
    const token = cookies['session_token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const supabase = getSupabaseServerClient();

    const { data: session } = await supabase
      .from('user_sessions')
      .select('user_id, user_type')
      .eq('session_token', token)
      .maybeSingle();

    if (!session || session.user_type !== 'customer') {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const userId = session.user_id;

    // Fetch recent quotes with totals; we'll filter out converted ones client-side
    const { data: quotesRaw } = await supabase
      .from('quote_submissions')
      .select(`
        quote_id,
        quote_number,
        status,
        source_lang,
        target_lang,
        hitl_required,
        created_at,
        quote_results(total, converted_to_order_id, converted_at)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    const activeQuotesRaw = (quotesRaw || []).filter(q => !q.quote_results?.[0]?.converted_to_order_id);

    // Count documents for each active quote using quote_files
    const quotesWithDocs = await Promise.all(
      activeQuotesRaw.slice(0, 3).map(async (q) => {
        const { count } = await supabase
          .from('quote_files')
          .select('*', { count: 'exact', head: true })
          .eq('quote_id', q.quote_id);
        return {
          id: q.quote_id,
          quote_id: q.quote_id,
          quote_number: q.quote_number || q.quote_id,
          status: q.status || 'draft',
          source_lang: q.source_lang,
          target_lang: q.target_lang,
          hitl_required: !!q.hitl_required,
          created_at: q.created_at,
          total: q.quote_results?.[0]?.total || null,
          document_count: count || 0
        };
      })
    );

    // Fetch recent orders; attach languages from related quote
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('id, quote_id, order_number, status, total, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const orders = await Promise.all(
      (recentOrders || []).map(async (o) => {
        const { data: qsub } = await supabase
          .from('quote_submissions')
          .select('source_lang, target_lang')
          .eq('quote_id', o.quote_id)
          .maybeSingle();
        return {
          ...o,
          source_lang: qsub?.source_lang || null,
          target_lang: qsub?.target_lang || null
        };
      })
    );

    // Stats
    const activeStatuses = ['draft', 'awaiting_review'];
    const { count: activeQuotesCount } = await supabase
      .from('quote_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', activeStatuses);

    const inProgressStatuses = ['pending_payment', 'processing', 'draft_review', 'certification', 'paid'];
    const { count: inProgressCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', inProgressStatuses);

    const { count: completedCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');

    const { data: completedTotals } = await supabase
      .from('orders')
      .select('total')
      .eq('user_id', userId)
      .eq('status', 'completed');

    const totalSpent = (completedTotals || []).reduce((sum, r) => sum + Number(r.total || 0), 0);

    return res.status(200).json({
      active_quotes: quotesWithDocs,
      recent_orders: orders,
      stats: {
        active_quotes: activeQuotesCount || 0,
        in_progress_orders: inProgressCount || 0,
        completed_orders: completedCount || 0,
        total_spent: Number.isFinite(totalSpent) ? totalSpent.toFixed(2) : '0.00'
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
