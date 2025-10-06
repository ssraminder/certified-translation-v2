import { getSupabaseServerClient } from '../../../../lib/supabaseServer';

function parseCookies(cookieHeader){
  const out = {}; if (!cookieHeader) return out; const parts = cookieHeader.split(';');
  for (const p of parts){ const [k, ...v] = p.trim().split('='); out[k] = decodeURIComponent(v.join('=')); }
  return out;
}

export default async function handler(req, res){
  try{
    const cookies = parseCookies(req.headers.cookie || '');
    const token = cookies['admin_session_token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const supabase = getSupabaseServerClient();
    const nowIso = new Date().toISOString();

    const { data: session } = await supabase
      .from('admin_sessions')
      .select('*')
      .eq('session_token', token)
      .gt('expires_at', nowIso)
      .maybeSingle();

    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    // pending_hitl
    let pending_hitl = 0;
    {
      const { count } = await supabase
        .from('quotes')
        .select('id', { count: 'exact', head: true })
        .eq('hitl_required', true)
        .is('hitl_completed_at', null);
      pending_hitl = count || 0;
    }

    // active_orders
    let active_orders = 0;
    {
      // status NOT IN ('completed','cancelled')
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .not('status', 'in', '("completed","cancelled")');
      active_orders = count || 0;
    }

    // today's revenue
    let todays_revenue = 0;
    {
      const start = new Date(); start.setHours(0,0,0,0);
      const end = new Date(); end.setHours(23,59,59,999);
      const { data: rows } = await supabase
        .from('orders')
        .select('total_amount, completed_at, status')
        .eq('status','completed')
        .gte('completed_at', start.toISOString())
        .lt('completed_at', new Date(end.getTime()+1).toISOString());
      todays_revenue = (rows || []).reduce((sum, r) => sum + Number(r.total_amount || 0), 0);
    }

    // orders_by_status
    let orders_by_status = { pending: 0, processing: 0, draft_review: 0, certification: 0, completed: 0 };
    {
      const { data: rows } = await supabase
        .from('orders')
        .select('status');
      for (const r of rows || []) {
        const k = (r.status || '').toLowerCase();
        if (k in orders_by_status) orders_by_status[k]++;
      }
    }

    // pending_messages (stub until Part 8)
    const pending_messages = 0;

    return res.status(200).json({ pending_hitl, active_orders, todays_revenue, pending_messages, orders_by_status });
  } catch (e) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
}
