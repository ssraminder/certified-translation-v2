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
    if (!token) return res.status(200).json({ authenticated: false });

    const supabase = getSupabaseServerClient();
    const nowIso = new Date().toISOString();

    const { data: session } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('session_token', token)
      .gt('expires_at', nowIso)
      .maybeSingle();

    if (!session) return res.status(200).json({ authenticated: false });

    await supabase.from('user_sessions').update({ last_activity_at: nowIso }).eq('id', session.id);

    let user = null;
    if (session.user_type === 'admin') {
      const { data } = await supabase.from('admin_users').select('id, email, first_name, last_name, role').eq('id', session.user_id).maybeSingle();
      user = data;
    } else {
      const { data } = await supabase.from('users').select('id, email, first_name, last_name').eq('id', session.user_id).maybeSingle();
      user = data;
    }

    if (!user) return res.status(200).json({ authenticated: false });

    return res.status(200).json({ authenticated: true, user: { ...user, user_type: session.user_type } });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
}
