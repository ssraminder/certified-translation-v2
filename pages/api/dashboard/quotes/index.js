import { getSupabaseServerClient } from '../../../../lib/supabaseServer';

function parseCookies(cookieHeader) {
  const out = {}; if (!cookieHeader) return out; const parts = cookieHeader.split(';');
  for (const p of parts) { const [k, ...v] = p.trim().split('='); out[k] = decodeURIComponent(v.join('=')); }
  return out;
}

export default async function handler(req, res) {
  if (req.method === 'GET') return handleGetQuotes(req, res);
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGetQuotes(req, res) {
  try {
    const cookies = parseCookies(req.headers.cookie || '');
    const sessionToken = cookies['session_token'];
    if (!sessionToken) return res.status(401).json({ error: 'Unauthorized' });

    const supabase = getSupabaseServerClient();
    const nowIso = new Date().toISOString();

    const { data: session } = await supabase
      .from('user_sessions')
      .select('user_id')
      .eq('session_token', sessionToken)
      .gt('expires_at', nowIso)
      .maybeSingle();

    if (!session) return res.status(401).json({ error: 'Invalid session' });

    const userId = session.user_id;
    const { status, sort, search } = req.query || {};

    let query = supabase
      .from('quote_submissions')
      .select(`
        quote_id,
        quote_number,
        quote_state,
        source_lang,
        target_lang,
        hitl_required,
        hitl_reason,
        created_at,
        expires_at,
        completion_percentage,
        last_completed_step,
        converted_at,
        updated_at,
        quote_results(total, subtotal, tax)
      `)
      .eq('user_id', userId)
      .is('archived_at', null);

    if (status && status !== 'all') {
      if (status === 'under_review') {
        query = query.in('quote_state', ['pending_review', 'under_review', 'reviewed']);
      } else if (status === 'converted') {
        query = query.eq('quote_state', 'converted');
      } else {
        query = query.eq('quote_state', status);
      }
    }

    if (search) {
      query = query.ilike('quote_number', `%${search}%`);
    }

    switch (sort) {
      case 'created_asc':
        query = query.order('created_at', { ascending: true });
        break;
      case 'expires_soon':
        query = query.order('expires_at', { ascending: true, nullsFirst: false });
        break;
      case 'created_desc':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    const { data: quotes, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const enhancedQuotes = await Promise.all(
      (quotes || []).map(async (quote) => {
        const { count } = await supabase
          .from('quote_files')
          .select('*', { count: 'exact', head: true })
          .eq('quote_id', quote.quote_id);

        let daysUntilExpiry = null;
        if (quote.expires_at) {
          const now = new Date();
          const expiryDate = new Date(quote.expires_at);
          const diffTime = expiryDate - now;
          daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        let lastCompletedStep = quote.last_completed_step || 1;
        if (!quote.last_completed_step) {
          const pct = Number(quote.completion_percentage || 0);
          if (pct >= 75) lastCompletedStep = 4;
          else if (pct >= 50) lastCompletedStep = 3;
          else if (pct >= 25) lastCompletedStep = 2;
        }

        return {
          id: quote.quote_id,
          quote_number: quote.quote_number,
          quote_state: quote.quote_state,
          source_language: quote.source_lang,
          target_language: quote.target_lang,
          hitl_required: quote.hitl_required,
          hitl_reason: quote.hitl_reason,
          created_at: quote.created_at,
          expires_at: quote.expires_at,
          converted_at: quote.converted_at,
          completion_percentage: quote.completion_percentage,
          last_completed_step: lastCompletedStep,
          document_count: count || 0,
          total: Array.isArray(quote.quote_results) && quote.quote_results[0]?.total != null ? quote.quote_results[0].total : null,
          days_until_expiry: daysUntilExpiry
        };
      })
    );

    const { data: allForStats } = await supabase
      .from('quote_submissions')
      .select('quote_state')
      .eq('user_id', userId)
      .is('archived_at', null);

    const stats = {
      all: allForStats?.length || 0,
      draft: (allForStats || []).filter((q) => q.quote_state === 'draft').length || 0,
      open: (allForStats || []).filter((q) => ['open', 'sent'].includes(q.quote_state)).length || 0,
      under_review: (allForStats || []).filter((q) => ['pending_review', 'under_review', 'reviewed'].includes(q.quote_state)).length || 0,
      expired: (allForStats || []).filter((q) => q.quote_state === 'expired').length || 0,
      converted: (allForStats || []).filter((q) => q.quote_state === 'converted').length || 0,
    };

    return res.status(200).json({ quotes: enhancedQuotes, stats });
  } catch (err) {
    console.error('Quotes list error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
