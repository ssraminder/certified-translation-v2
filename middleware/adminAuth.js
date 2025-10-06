import { getSupabaseServerClient } from '../lib/supabaseServer';

function parseCookies(cookieHeader) {
  const out = {}; if (!cookieHeader) return out; const parts = cookieHeader.split(';');
  for (const p of parts) { const [k, ...v] = p.trim().split('='); out[k] = decodeURIComponent(v.join('=')); }
  return out;
}

export async function requireAdmin(req, res, next) {
  try {
    const cookies = parseCookies(req.headers.cookie || '');
    const token = cookies['admin_session_token'];
    if (!token) { res.redirect('/login?redirect=' + encodeURIComponent(req.url || '/admin')); return; }

    const supabase = getSupabaseServerClient();
    const nowIso = new Date().toISOString();

    const { data: session } = await supabase
      .from('admin_sessions')
      .select('*')
      .eq('session_token', token)
      .gt('expires_at', nowIso)
      .maybeSingle();

    if (!session) { res.redirect('/login?redirect=' + encodeURIComponent(req.url || '/admin')); return; }

    const { data: admin } = await supabase
      .from('admin_users')
      .select('id, email, first_name, last_name, role, is_active, status')
      .eq('id', session.admin_user_id)
      .maybeSingle();

    if (!admin || admin.is_active === false || (admin.status && admin.status !== 'active')) {
      await supabase.from('admin_sessions').delete().eq('id', session.id);
      res.setHeader('Set-Cookie', `admin_session_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV==='production'?'; Secure':''}`);
      res.redirect('/login');
      return;
    }

    await supabase
      .from('admin_sessions')
      .update({ last_activity_at: nowIso })
      .eq('id', session.id);

    req.admin = admin;
    req.adminSession = session;
    next();
  } catch {
    res.redirect('/login');
  }
}
