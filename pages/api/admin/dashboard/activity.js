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

    const { data: activities } = await supabase
      .from('admin_activity_log')
      .select('id, admin_user_id, action, target, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    const ids = Array.from(new Set((activities || []).map(a => a.admin_user_id).filter(Boolean)));
    let nameMap = {};
    if (ids.length) {
      const { data: admins } = await supabase
        .from('admin_users')
        .select('id, first_name, last_name, email')
        .in('id', ids);
      for (const a of admins || []) {
        nameMap[a.id] = (a.first_name && a.last_name) ? `${a.first_name} ${a.last_name}` : (a.first_name || a.last_name || a.email);
      }
    }

    return res.status(200).json({
      activities: (activities || []).map(a => ({
        id: a.id,
        admin_name: nameMap[a.admin_user_id] || 'Admin',
        action: a.action,
        target: a.target,
        timestamp: a.created_at,
      }))
    });
  } catch (e) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
}
