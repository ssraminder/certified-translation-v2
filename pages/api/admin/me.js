import { withApiBreadcrumbs } from '../../../lib/sentry';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';

function parseCookies(cookieHeader){
  const out = {}; if (!cookieHeader) return out; const parts = cookieHeader.split(';');
  for (const p of parts){ const [k, ...v] = p.trim().split('='); out[k] = decodeURIComponent(v.join('=')); }
  return out;
}

async function handler(req, res){
  try {
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

    const { data: admin } = await supabase
      .from('admin_users')
      .select('id, email, first_name, last_name, role, is_active, status, last_login_at')
      .eq('id', session.admin_user_id)
      .maybeSingle();

    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    if (admin.is_active === false || (admin.status && admin.status !== 'active')) {
      // Invalidate session if admin not active
      await supabase.from('admin_sessions').delete().eq('id', session.id);
      res.setHeader('Set-Cookie', `admin_session_token=; Max-Age=0; Path=/admin; HttpOnly; SameSite=Lax${process.env.NODE_ENV==='production'?'; Secure':''}`);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const newExpires = new Date(Date.now() + 30*24*60*60*1000).toISOString();
    await supabase
      .from('admin_sessions')
      .update({ last_activity_at: nowIso, expires_at: newExpires })
      .eq('id', session.id);

    return res.status(200).json({
      id: admin.id,
      email: admin.email,
      full_name: admin.first_name && admin.last_name ? `${admin.first_name} ${admin.last_name}` : (admin.first_name || admin.last_name || null),
      role: admin.role,
      is_active: admin.is_active !== false,
      last_login_at: admin.last_login_at || null
    });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
}

export default withApiBreadcrumbs(handler);
