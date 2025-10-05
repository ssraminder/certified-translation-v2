import { withApiBreadcrumbs } from '../../../../lib/sentry';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';

function parseCookies(cookieHeader){
  const out = {}; if (!cookieHeader) return out; const parts = cookieHeader.split(';');
  for (const p of parts){ const [k, ...v] = p.trim().split('='); out[k] = decodeURIComponent(v.join('=')); }
  return out;
}

async function getAuthedUser(req){
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies['session_token'];
  if (!token) return { status: 401, error: 'Unauthorized' };
  const supabase = getSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const { data: session } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('session_token', token)
    .gt('expires_at', nowIso)
    .maybeSingle();
  if (!session || session.user_type !== 'customer') return { status: 401, error: 'Invalid session' };
  return { supabase, userId: session.user_id };
}

function buildSort(sort){
  switch (sort) {
    case 'created_asc': return { col: 'created_at', asc: true };
    case 'total_desc': return { col: 'total', asc: false };
    case 'total_asc': return { col: 'total', asc: true };
    case 'created_desc':
    default: return { col: 'created_at', asc: false };
  }
}

async function handler(req, res){
  try {
    const auth = await getAuthedUser(req);
    if (auth.status) return res.status(auth.status).json({ error: auth.error });
    const { supabase, userId } = auth;

    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { status = 'all', sort = 'created_desc', search = '' } = req.query || {};

    let q = supabase.from('orders').select('*').eq('user_id', userId);
    if (status && status !== 'all') q = q.eq('status', status);
    if (search && String(search).trim()) q = q.ilike('order_number', `%${String(search).trim()}%`);

    const s = buildSort(sort);
    q = q.order(s.col, { ascending: s.asc });

    const { data: orders, error } = await q;
    if (error) throw error;

    // document counts per order
    const withDocs = await Promise.all((orders || []).map(async (o) => {
      const { count } = await supabase
        .from('quote_files')
        .select('*', { count: 'exact', head: true })
        .eq('order_id', o.id);
      return { ...o, document_count: count || 0 };
    }));

    // stats independent of current filter
    const [{ count: totalAll }, { count: pendingCount }, { count: inProg }, { count: completedCount }, { count: deliveredCount }] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'pending_payment'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', userId).in('status', ['processing','paid','draft_review','certification']),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'completed'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'delivered'),
    ]);

    return res.status(200).json({
      orders: withDocs,
      stats: {
        all: totalAll || 0,
        pending_payment: pendingCount || 0,
        in_progress: inProg || 0,
        completed: completedCount || 0,
        delivered: deliveredCount || 0,
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}

export default withApiBreadcrumbs(handler);
