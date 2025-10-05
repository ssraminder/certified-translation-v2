import { getSupabaseServerClient } from '../../lib/supabaseServer';
import crypto from 'crypto';

function setSessionCookie(res, token){
  const isProd = process.env.NODE_ENV === 'production';
  const cookie = `session_token=${token}; Max-Age=${30*24*60*60}; Path=/; HttpOnly; SameSite=Lax${isProd?'; Secure':''}`;
  res.setHeader('Set-Cookie', cookie);
}

export default async function handler(req, res){
  try {
    const token = String(req.query.token || '');
    if (!token || token.length < 10) {
      return res.status(400).send(renderError('Invalid or expired link'));
    }
    const supabase = getSupabaseServerClient();

    const { data: link } = await supabase
      .from('magic_links')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (!link) return res.status(400).send(renderError('Invalid or expired link'));
    if (link.used_at) return res.status(400).send(renderError('Invalid or expired link'));
    if (new Date(link.expires_at).getTime() <= Date.now()) return res.status(400).send(renderError('Invalid or expired link'));

    const userType = link.user_type === 'admin' ? 'admin' : 'customer';

    let user = null;
    if (userType === 'admin') {
      const { data } = await supabase.from('admin_users').select('id, email, first_name, last_name').eq('id', link.user_id).maybeSingle();
      user = data;
    } else {
      const { data } = await supabase.from('users').select('id, email, first_name, last_name').eq('id', link.user_id).maybeSingle();
      user = data;
    }
    if (!user) return res.status(400).send(renderError('Invalid or expired link'));

    const nowIso = new Date().toISOString();
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || '';

    await supabase.from('magic_links').update({ used_at: nowIso, used_ip: ip || null, used_user_agent: userAgent || null }).eq('id', link.id);

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30*24*60*60*1000).toISOString();
    await supabase.from('user_sessions').insert([{ user_id: user.id, user_type: userType, session_token: sessionToken, expires_at: expiresAt, ip: ip || null, user_agent: userAgent || null }]);

    if (userType === 'admin') {
      await supabase.from('admin_users').update({ last_login_at: nowIso, email_verified: true, updated_at: nowIso }).eq('id', user.id);
    } else {
      await supabase.from('users').update({ last_login_at: nowIso, email_verified: true, email_verified_at: nowIso, updated_at: nowIso }).eq('id', user.id);
    }

    setSessionCookie(res, sessionToken);

    const redirectUrl = (link.metadata && link.metadata.redirect_url) ? link.metadata.redirect_url : (userType === 'admin' ? '/admin/dashboard' : '/dashboard');
    res.writeHead(302, { Location: redirectUrl });
    return res.end();
  } catch (err) {
    return res.status(500).send(renderError('Unexpected error'));
  }
}

function renderError(message){
  return `<!DOCTYPE html><html><body style="font-family: system-ui, -apple-system; padding:40px;">
  <div style="max-width:560px;margin:0 auto;">
    <h1 style="margin:0 0 12px;color:#111;">Login Error</h1>
    <p style="color:#444;margin:0 0 18px;">${message}</p>
    <a href="/login" style="display:inline-block;background:#00B8D4;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:700;">Go to Login</a>
  </div>
</body></html>`;
}
